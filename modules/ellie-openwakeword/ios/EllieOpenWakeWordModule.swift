import AVFoundation
import ExpoModulesCore
import Foundation

#if canImport(onnxruntime_objc)
import onnxruntime_objc
#endif

private final class WakeWordException: GenericException<String> {
  override var reason: String { param }
}

public final class EllieOpenWakeWordModule: Module {
  private let stateLock = NSLock()
  private let inferenceQueue = DispatchQueue(label: "ellie.openwakeword.inference", qos: .userInitiated)

  private var initialized = false
  private var listening = false
  private var keywordLabel = "Hey Ellie"
  private var threshold = 0.1
  private var triggerCooldownMs = 2000.0
  private var minRmsForDetection = defaultMinRmsForDetection
  private var activationFrames = defaultActivationFrames
  private var scoreSmoothingAlpha = defaultScoreSmoothingAlpha
  private var lastDetectionTimestamp = 0.0
  private var lastInferenceSampleTimestamp = 0.0
  private var lastFrameRms = 0.0
  private var smoothedScore: Double?
  private var consecutiveTriggerFrames = 0

  private var classifierModelPath: String?
  private var melspectrogramModelPath: String?
  private var embeddingModelPath: String?

  private var ortEnv: ORTEnv?
  private var classifierSession: ORTSession?
  private var melspectrogramSession: ORTSession?
  private var embeddingSession: ORTSession?

  private var classifierInputName = ""
  private var classifierOutputName = ""
  private var melspectrogramInputName = ""
  private var melspectrogramOutputName = ""
  private var embeddingInputName = ""
  private var embeddingOutputName = ""

  private var audioEngine: AVAudioEngine?
  private var audioConverter: AVAudioConverter?
  private var inputFormat: AVAudioFormat?
  private var targetFormat: AVAudioFormat?
  private var stopRequested = false

  private let pendingAudio = FloatAccumulationBuffer()
  private let rawAudioBuffer = FloatRingBuffer(capacity: rawBufferMaxSamples)
  private let melspectrogramBuffer = MutableFrameBuffer(maxFrames: melspectrogramMaxFrames, frameWidth: melspectrogramBins)
  private let featureBuffer = MutableFrameBuffer(maxFrames: featureBufferMaxFrames, frameWidth: embeddingDimension)
  private var warmupFrames = 0

  public func definition() -> ModuleDefinition {
    Name("EllieOpenWakeWord")

    Events("onWakeWordDetected", "onWakeWordError", "onWakeWordInference")

    Function("isAvailable") {
      true
    }

    Function("isInitialized") {
      self.stateLock.withLock {
        self.initialized
      }
    }

    Function("isListening") {
      self.stateLock.withLock {
        self.listening
      }
    }

    Function("getConfig") {
      self.stateLock.withLock {
        [
          "keywordLabel": self.keywordLabel,
          "threshold": self.threshold,
          "triggerCooldownMs": self.triggerCooldownMs,
          "minRmsForDetection": self.minRmsForDetection,
          "activationFrames": self.activationFrames,
          "scoreSmoothingAlpha": self.scoreSmoothingAlpha,
        ]
      }
    }

    AsyncFunction("initialize") { (options: [String: Any]) in
      do {
        try self.stateLock.withLockThrowing {
          let modelPath = try self.resolveModelPath(configuredPath: options["modelPath"] as? String, optionName: "modelPath")

          let customMelspectrogramModelPath = (options["melspectrogramModelPath"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)

          let customEmbeddingModelPath = (options["embeddingModelPath"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)

          let resolvedMelspectrogramPath: String
          if let customPath = customMelspectrogramModelPath, !customPath.isEmpty {
            resolvedMelspectrogramPath = try self.resolveModelPath(
              configuredPath: customPath,
              optionName: "melspectrogramModelPath"
            )
          } else if let bundledPath = self.resolveBundledModelPath(relativePath: defaultMelspectrogramAssetPath) {
            resolvedMelspectrogramPath = bundledPath
          } else {
            throw WakeWordException("Missing bundled melspectrogram model. Rebuild native app with updated module assets.")
          }

          let resolvedEmbeddingPath: String
          if let customPath = customEmbeddingModelPath, !customPath.isEmpty {
            resolvedEmbeddingPath = try self.resolveModelPath(
              configuredPath: customPath,
              optionName: "embeddingModelPath"
            )
          } else if let bundledPath = self.resolveBundledModelPath(relativePath: defaultEmbeddingAssetPath) {
            resolvedEmbeddingPath = bundledPath
          } else {
            throw WakeWordException("Missing bundled embedding model. Rebuild native app with updated module assets.")
          }

          if let providedKeywordLabel = options["keywordLabel"] as? String,
             !providedKeywordLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            self.keywordLabel = providedKeywordLabel
          } else {
            self.keywordLabel = "Hey Ellie"
          }

          if let providedThreshold = options["threshold"] as? Double {
            self.threshold = min(1.0, max(0.0, providedThreshold))
          } else {
            self.threshold = 0.45
          }

          if let providedCooldown = options["triggerCooldownMs"] as? Double {
            self.triggerCooldownMs = max(0.0, providedCooldown)
          } else {
            self.triggerCooldownMs = 1200.0
          }

          if let providedMinRms = options["minRmsForDetection"] as? Double {
            self.minRmsForDetection = min(1.0, max(0.0, providedMinRms))
          } else {
            self.minRmsForDetection = defaultMinRmsForDetection
          }

          if let providedActivationFrames = options["activationFrames"] as? Int {
            self.activationFrames = max(1, providedActivationFrames)
          } else if let providedActivationFrames = options["activationFrames"] as? Double {
            self.activationFrames = max(1, Int(providedActivationFrames.rounded()))
          } else {
            self.activationFrames = defaultActivationFrames
          }

          if let providedSmoothingAlpha = options["scoreSmoothingAlpha"] as? Double {
            self.scoreSmoothingAlpha = min(1.0, max(0.0, providedSmoothingAlpha))
          } else {
            self.scoreSmoothingAlpha = defaultScoreSmoothingAlpha
          }

          self.stopListeningLocked()
          self.destroySessionsLocked()

          self.classifierModelPath = modelPath
          self.melspectrogramModelPath = resolvedMelspectrogramPath
          self.embeddingModelPath = resolvedEmbeddingPath

          try self.initializeSessionsLocked()

          self.initialized = true
          self.listening = false
          self.lastDetectionTimestamp = 0.0
          self.lastInferenceSampleTimestamp = 0.0
          self.lastFrameRms = 0.0
          self.smoothedScore = nil
          self.consecutiveTriggerFrames = 0
          self.resetStreamingStateLocked()
        }
      } catch let error as GenericException<String> {
        throw error
      } catch {
        throw WakeWordException("OpenWakeWord initialize failed: \(error.localizedDescription)")
      }
    }

    AsyncFunction("start") {
      try self.stateLock.withLockThrowing {
        try self.ensureInitializedLocked()

        if self.listening {
          return
        }

        let permission = AVAudioSession.sharedInstance().recordPermission
        if permission != .granted {
          throw WakeWordException("Microphone permission is required for wake-word detection")
        }

        try self.startListeningLocked()
      }
    }

    AsyncFunction("stop") {
      self.stateLock.withLock {
        self.stopListeningLocked()
      }
    }

    AsyncFunction("destroy") {
      self.stateLock.withLock {
        self.stopListeningLocked()
        self.destroySessionsLocked()

        self.initialized = false
        self.listening = false
        self.lastDetectionTimestamp = 0.0
        self.lastInferenceSampleTimestamp = 0.0
        self.lastFrameRms = 0.0
        self.smoothedScore = nil
        self.consecutiveTriggerFrames = 0
        self.resetStreamingStateLocked()
      }
    }

    AsyncFunction("simulateDetection") { (score: Double?) in
      self.stateLock.withLock {
        if !self.listening {
          return
        }

        self.maybeEmitDetectionLocked(score: score ?? 0.95)
      }
    }
  }

  private func ensureInitializedLocked() throws {
    guard initialized,
          classifierSession != nil,
          melspectrogramSession != nil,
          embeddingSession != nil
    else {
      throw WakeWordException("OpenWakeWord module is not initialized")
    }
  }

  private func startListeningLocked() throws {
    try ensureInitializedLocked()

    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
    try audioSession.setPreferredSampleRate(Double(sampleRate))
    try audioSession.setPreferredIOBufferDuration(0.02)
    try audioSession.setActive(true)

    let engine = AVAudioEngine()
    let inputNode = engine.inputNode
    let sourceFormat = inputNode.outputFormat(forBus: 0)

    guard let target = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: Double(sampleRate), channels: 1, interleaved: false) else {
      throw WakeWordException("Failed to configure target audio format")
    }

    guard let converter = AVAudioConverter(from: sourceFormat, to: target) else {
      throw WakeWordException("Failed to configure audio converter")
    }

    stopRequested = false
    resetStreamingStateLocked()

    inputNode.removeTap(onBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: sourceFormat) { [weak self] buffer, _ in
      self?.handleIncomingAudio(buffer: buffer, sourceFormat: sourceFormat, targetFormat: target, converter: converter)
    }

    engine.prepare()
    try engine.start()

    audioEngine = engine
    audioConverter = converter
    inputFormat = sourceFormat
    targetFormat = target
    listening = true
  }

  private func stopListeningLocked() {
    stopRequested = true

    if let engine = audioEngine {
      engine.inputNode.removeTap(onBus: 0)
      engine.stop()
    }

    audioEngine = nil
    audioConverter = nil
    inputFormat = nil
    targetFormat = nil
    listening = false
  }

  private func handleIncomingAudio(
    buffer: AVAudioPCMBuffer,
    sourceFormat: AVAudioFormat,
    targetFormat: AVAudioFormat,
    converter: AVAudioConverter
  ) {
    let shouldProcess = stateLock.withLock {
      listening && !stopRequested
    }

    guard shouldProcess else {
      return
    }

    guard let samples = convertTo16kMonoFloatSamples(
      buffer: buffer,
      sourceFormat: sourceFormat,
      targetFormat: targetFormat,
      converter: converter
    ), !samples.isEmpty else {
      return
    }

    inferenceQueue.async { [weak self] in
      self?.processSamples(samples)
    }
  }

  private func processSamples(_ samples: [Float]) {
    let shouldProcess = stateLock.withLock {
      listening && !stopRequested
    }

    guard shouldProcess else {
      return
    }

    pendingAudio.append(samples)

    while pendingAudio.count >= frameSamples {
      let frame = pendingAudio.popFront(count: frameSamples)

      do {
        try processFrame(frame)
      } catch {
        stateLock.withLock {
          emitWakeWordError(code: "inference_runtime_error", message: "\(error.localizedDescription)")
          stopListeningLocked()
        }
        return
      }
    }
  }

  private func processFrame(_ frame: [Float]) throws {
    lastFrameRms = computeNormalizedRms(frame)
    rawAudioBuffer.append(frame)

    let melspectrogramInput = rawAudioBuffer.tail(count: frameSamples + melspectrogramContextSamples)
    if melspectrogramInput.isEmpty {
      return
    }

    let melFrames = try runMelspectrogramInference(inputSamples: melspectrogramInput)
    if melFrames.isEmpty {
      return
    }

    melspectrogramBuffer.append(frames: melFrames)

    if melspectrogramBuffer.count < melspectrogramWindowFrames {
      return
    }

    let embeddingInput = melspectrogramBuffer.tailFlatten(frameCount: melspectrogramWindowFrames)
    let embeddingVector = try runEmbeddingInference(inputFrames: embeddingInput)

    featureBuffer.append(frame: embeddingVector)
    if featureBuffer.count < classifierFeatureFrames {
      return
    }

    let classifierInput = featureBuffer.tailFlatten(frameCount: classifierFeatureFrames)
    let score = try runClassifierInference(inputFeatures: classifierInput)

    stateLock.withLock {
      guard listening, !stopRequested else {
        return
      }

      maybeEmitInferenceSampleLocked(score: score)

      if warmupFrames < minWarmupFrames {
        warmupFrames += 1
        return
      }

      maybeEmitDetectionLocked(score: score)
    }
  }

  private func runMelspectrogramInference(inputSamples: [Float]) throws -> [[Float]] {
    guard let session = melspectrogramSession else {
      throw WakeWordException("Melspectrogram session is unavailable")
    }

    let inputTensor = try makeFloatTensor(
      values: inputSamples,
      shape: [1, NSNumber(value: inputSamples.count)]
    )

    let outputs = try session.run(
      withInputs: [melspectrogramInputName: inputTensor],
      outputNames: Set([melspectrogramOutputName]),
      runOptions: nil
    )

    guard let outputTensor = outputs[melspectrogramOutputName] else {
      throw WakeWordException("Melspectrogram model returned no output")
    }

    let outputValues = try extractFloatValues(from: outputTensor)
    guard !outputValues.isEmpty else {
      return []
    }

    let tensorInfo = try outputTensor.tensorTypeAndShapeInfo()
    let inferredWidth = tensorInfo.shape.last?.intValue ?? melspectrogramBins
    let frameWidth = inferredWidth > 0 ? inferredWidth : melspectrogramBins

    var frames: [[Float]] = []
    var cursor = 0

    while cursor < outputValues.count {
      let end = min(cursor + frameWidth, outputValues.count)
      var frame = Array(outputValues[cursor..<end])
      if frame.count < frameWidth {
        frame.append(contentsOf: Array(repeating: 0, count: frameWidth - frame.count))
      }
      // Match OpenWakeWord Python preprocessing: spec = spec / 10 + 2.
      frame = frame.map { ($0 / melspectrogramScaleDivisor) + melspectrogramScaleOffset }
      frames.append(frame)
      cursor += frameWidth
    }

    return frames
  }

  private func runEmbeddingInference(inputFrames: [Float]) throws -> [Float] {
    guard let session = embeddingSession else {
      throw WakeWordException("Embedding session is unavailable")
    }

    let inputTensor = try makeFloatTensor(
      values: inputFrames,
      shape: [1, NSNumber(value: melspectrogramWindowFrames), NSNumber(value: melspectrogramBins), 1]
    )

    let outputs = try session.run(
      withInputs: [embeddingInputName: inputTensor],
      outputNames: Set([embeddingOutputName]),
      runOptions: nil
    )

    guard let outputTensor = outputs[embeddingOutputName] else {
      throw WakeWordException("Embedding model returned no output")
    }

    let outputValues = try extractFloatValues(from: outputTensor)
    guard !outputValues.isEmpty else {
      throw WakeWordException("Embedding model returned empty output")
    }

    let vectorSize = min(embeddingDimension, outputValues.count)
    var embedding = Array(repeating: Float(0), count: embeddingDimension)
    let startIndex = outputValues.count - vectorSize
    let destinationStart = embeddingDimension - vectorSize

    for index in 0..<vectorSize {
      embedding[destinationStart + index] = outputValues[startIndex + index]
    }

    return embedding
  }

  private func runClassifierInference(inputFeatures: [Float]) throws -> Double {
    guard let session = classifierSession else {
      throw WakeWordException("Classifier session is unavailable")
    }

    let inputTensor = try makeFloatTensor(
      values: inputFeatures,
      shape: [1, NSNumber(value: classifierFeatureFrames), NSNumber(value: embeddingDimension)]
    )

    let outputs = try session.run(
      withInputs: [classifierInputName: inputTensor],
      outputNames: Set([classifierOutputName]),
      runOptions: nil
    )

    guard let outputTensor = outputs[classifierOutputName] else {
      throw WakeWordException("Classifier model returned no output")
    }

    let outputValues = try extractFloatValues(from: outputTensor)
    if outputValues.isEmpty {
      return 0.0
    }

    let rawScore: Double
    if outputValues.count == 1 {
      rawScore = Double(outputValues[0])
    } else {
      rawScore = Double(outputValues.dropFirst().max() ?? outputValues[0])
    }

    return normalizeScore(rawScore)
  }

  private func normalizeScore(_ value: Double) -> Double {
    if value.isNaN {
      return 0.0
    }

    if (0.0...1.0).contains(value) {
      return value
    }

    return 1.0 / (1.0 + Foundation.exp(-value))
  }

  private func maybeEmitDetectionLocked(score: Double) {
    let effectiveScore = updateSmoothedScoreLocked(score)
    let hasVoiceEnergy = lastFrameRms >= minRmsForDetection
    let thresholdMatched = effectiveScore >= threshold

    consecutiveTriggerFrames = thresholdMatched && hasVoiceEnergy
      ? min(activationFrames, consecutiveTriggerFrames + 1)
      : 0

    if consecutiveTriggerFrames < activationFrames {
      return
    }

    let now = Date().timeIntervalSince1970 * 1000.0
    if now - lastDetectionTimestamp < triggerCooldownMs {
      return
    }

    lastDetectionTimestamp = now
    consecutiveTriggerFrames = 0

    sendEvent("onWakeWordDetected", [
      "keywordLabel": keywordLabel,
      "score": effectiveScore,
      "rawScore": score,
      "timestamp": now,
    ])
  }

  private func maybeEmitInferenceSampleLocked(score: Double) {
    let now = Date().timeIntervalSince1970 * 1000.0
    if now - lastInferenceSampleTimestamp < inferenceSampleIntervalMs {
      return
    }

    lastInferenceSampleTimestamp = now
    sendEvent("onWakeWordInference", [
      "score": score,
      "smoothedScore": smoothedScore,
      "threshold": threshold,
      "rms": lastFrameRms,
      "minRmsForDetection": minRmsForDetection,
      "activationFrames": activationFrames,
      "consecutiveTriggerFrames": consecutiveTriggerFrames,
      "timestamp": now,
    ])
  }

  private func updateSmoothedScoreLocked(_ score: Double) -> Double {
    guard score.isFinite else {
      return smoothedScore ?? 0.0
    }

    if scoreSmoothingAlpha <= 0.0 || scoreSmoothingAlpha >= 1.0 {
      smoothedScore = score
      return score
    }

    if let previous = smoothedScore, previous.isFinite {
      let next = (scoreSmoothingAlpha * score) + ((1.0 - scoreSmoothingAlpha) * previous)
      smoothedScore = next
      return next
    }

    smoothedScore = score
    return score
  }

  private func computeNormalizedRms(_ frame: [Float]) -> Double {
    guard !frame.isEmpty else {
      return 0.0
    }

    var sumSquares = 0.0
    for sample in frame {
      let normalized = Double(sample) / 32768.0
      sumSquares += normalized * normalized
    }

    return min(1.0, max(0.0, Foundation.sqrt(sumSquares / Double(frame.count))))
  }

  private func initializeSessionsLocked() throws {
    guard let classifierModelPath,
          let melspectrogramModelPath,
          let embeddingModelPath
    else {
      throw WakeWordException("Model paths are missing during wake-word initialization")
    }

    do {
      let env = try ORTEnv(loggingLevel: ORTLoggingLevel.warning)
      let options = try ORTSessionOptions()
      try options.setIntraOpNumThreads(1)

      let melspecSession = try ORTSession(env: env, modelPath: melspectrogramModelPath, sessionOptions: options)
      let embedSession = try ORTSession(env: env, modelPath: embeddingModelPath, sessionOptions: options)
      let keywordSession = try ORTSession(env: env, modelPath: classifierModelPath, sessionOptions: options)

      guard let melspecInput = try melspecSession.inputNames().first,
            let melspecOutput = try melspecSession.outputNames().first
      else {
        throw WakeWordException("Melspectrogram model has no input/output")
      }

      guard let embedInput = try embedSession.inputNames().first,
            let embedOutput = try embedSession.outputNames().first
      else {
        throw WakeWordException("Embedding model has no input/output")
      }

      guard let classifierInput = try keywordSession.inputNames().first,
            let classifierOutput = try keywordSession.outputNames().first
      else {
        throw WakeWordException("Classifier model has no input/output")
      }

      ortEnv = env
      melspectrogramSession = melspecSession
      embeddingSession = embedSession
      classifierSession = keywordSession

      melspectrogramInputName = melspecInput
      melspectrogramOutputName = melspecOutput
      embeddingInputName = embedInput
      embeddingOutputName = embedOutput
      classifierInputName = classifierInput
      classifierOutputName = classifierOutput
    } catch {
      destroySessionsLocked()
      throw WakeWordException("Failed to initialize OpenWakeWord ONNX pipeline: \(error.localizedDescription)")
    }
  }

  private func destroySessionsLocked() {
    classifierSession = nil
    melspectrogramSession = nil
    embeddingSession = nil
    ortEnv = nil

    classifierInputName = ""
    classifierOutputName = ""
    melspectrogramInputName = ""
    melspectrogramOutputName = ""
    embeddingInputName = ""
    embeddingOutputName = ""
  }

  private func resetStreamingStateLocked() {
    pendingAudio.clear()
    rawAudioBuffer.clear()

    melspectrogramBuffer.clear()
    for _ in 0..<melspectrogramWindowFrames {
      melspectrogramBuffer.append(frame: Array(repeating: 1.0, count: melspectrogramBins))
    }

    featureBuffer.clear()
    warmupFrames = 0
    smoothedScore = nil
    consecutiveTriggerFrames = 0
  }

  private func makeFloatTensor(values: [Float], shape: [NSNumber]) throws -> ORTValue {
    let data = values.withUnsafeBufferPointer { pointer -> NSMutableData in
      guard let baseAddress = pointer.baseAddress else {
        return NSMutableData()
      }

      return NSMutableData(bytes: baseAddress, length: pointer.count * MemoryLayout<Float>.size)
    }

    return try ORTValue(tensorData: data, elementType: ORTTensorElementDataType.float, shape: shape)
  }

  private func extractFloatValues(from tensor: ORTValue) throws -> [Float] {
    let mutableData = try tensor.tensorData()
    let data = mutableData as Data
    let byteCount = data.count
    guard byteCount > 0 else {
      return []
    }

    let count = byteCount / MemoryLayout<Float>.size
    return data.withUnsafeBytes { rawBuffer in
      let typed = rawBuffer.bindMemory(to: Float.self)
      return Array(typed.prefix(count))
    }
  }

  private func resolveModelPath(configuredPath: String?, optionName: String) throws -> String {
    guard let configuredPath else {
      throw WakeWordException("\(optionName) is required")
    }

    let trimmed = configuredPath.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty {
      throw WakeWordException("\(optionName) must not be empty")
    }

    let normalized: String
    if trimmed.hasPrefix("file://") {
      normalized = String(trimmed.dropFirst("file://".count))
    } else {
      normalized = trimmed
    }

    if FileManager.default.fileExists(atPath: normalized) {
      return normalized
    }

    if let bundledPath = resolveBundledModelPath(relativePath: normalized) {
      return bundledPath
    }

    throw WakeWordException("\(optionName) does not exist at '\(trimmed)'")
  }

  private func resolveBundledModelPath(relativePath: String) -> String? {
    let normalized = relativePath.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    if normalized.isEmpty {
      return nil
    }

    if FileManager.default.fileExists(atPath: normalized) {
      return normalized
    }

    let fileURL = URL(fileURLWithPath: normalized)
    let fileExtension = fileURL.pathExtension
    let resourceName = fileURL.deletingPathExtension().path

    // Build list of candidate bundles, including the module's resource bundle
    var candidateBundles = [Bundle.main, Bundle(for: EllieOpenWakeWordModule.self)]

    // Look for EllieOpenWakeWordResources.bundle inside the module's own bundle
    // and inside the main bundle (CocoaPods resource_bundles places it here)
    for parentBundle in [Bundle(for: EllieOpenWakeWordModule.self), Bundle.main] {
      if let resourceBundleURL = parentBundle.url(forResource: "EllieOpenWakeWordResources", withExtension: "bundle"),
         let resourceBundle = Bundle(url: resourceBundleURL)
      {
        candidateBundles.insert(resourceBundle, at: 0)
      }
    }

    candidateBundles.append(contentsOf: Bundle.allBundles)
    candidateBundles.append(contentsOf: Bundle.allFrameworks)

    for bundle in candidateBundles {
      if !resourceName.isEmpty,
         let path = bundle.path(forResource: resourceName, ofType: fileExtension.isEmpty ? nil : fileExtension),
         FileManager.default.fileExists(atPath: path)
      {
        return path
      }

      if let resourceURL = bundle.resourceURL?.appendingPathComponent(normalized),
         FileManager.default.fileExists(atPath: resourceURL.path)
      {
        return resourceURL.path
      }

      let bundleRelativePath = bundle.bundlePath + "/" + normalized
      if FileManager.default.fileExists(atPath: bundleRelativePath) {
        return bundleRelativePath
      }
    }

    return nil
  }

  private func convertTo16kMonoFloatSamples(
    buffer: AVAudioPCMBuffer,
    sourceFormat: AVAudioFormat,
    targetFormat: AVAudioFormat,
    converter: AVAudioConverter
  ) -> [Float]? {
    let sourceRateMatches = Int(sourceFormat.sampleRate.rounded()) == sampleRate
    let sourceMono = sourceFormat.channelCount == 1

    if sourceRateMatches,
       sourceMono,
       sourceFormat.commonFormat == .pcmFormatFloat32,
       let floatData = buffer.floatChannelData?[0]
    {
      let frameCount = Int(buffer.frameLength)
      if frameCount == 0 {
        return nil
      }

      let pointer = UnsafeBufferPointer(start: floatData, count: frameCount)
      return pointer.map { sample in
        let clamped = max(-1.0, min(1.0, sample))
        return clamped * 32767.0
      }
    }

    if sourceRateMatches,
       sourceMono,
       sourceFormat.commonFormat == .pcmFormatInt16,
       let int16Data = buffer.int16ChannelData?[0]
    {
      let frameCount = Int(buffer.frameLength)
      if frameCount == 0 {
        return nil
      }

      let pointer = UnsafeBufferPointer(start: int16Data, count: frameCount)
      return pointer.map { Float($0) }
    }

    let estimatedOutputFrames = AVAudioFrameCount(Double(buffer.frameLength) * targetFormat.sampleRate / sourceFormat.sampleRate) + 8
    guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: estimatedOutputFrames) else {
      return nil
    }

    var providedInput = false
    var conversionError: NSError?

    let status = converter.convert(to: convertedBuffer, error: &conversionError) { _, outStatus in
      if providedInput {
        outStatus.pointee = .noDataNow
        return nil
      }

      providedInput = true
      outStatus.pointee = .haveData
      return buffer
    }

    if status == .error || conversionError != nil {
      return nil
    }

    let frameCount = Int(convertedBuffer.frameLength)
    if frameCount == 0 {
      return nil
    }

    guard let convertedData = convertedBuffer.floatChannelData?[0] else {
      return nil
    }

    let pointer = UnsafeBufferPointer(start: convertedData, count: frameCount)
    return pointer.map { sample in
      let clamped = max(-1.0, min(1.0, sample))
      return clamped * 32767.0
    }
  }

  private func emitWakeWordError(code: String, message: String) {
    sendEvent("onWakeWordError", [
      "code": code,
      "message": message,
    ])
  }
}

private extension NSLock {
  func withLock<T>(_ work: () -> T) -> T {
    lock()
    defer { unlock() }
    return work()
  }

  func withLockThrowing<T>(_ work: () throws -> T) throws -> T {
    lock()
    defer { unlock() }
    return try work()
  }
}

private final class FloatAccumulationBuffer {
  private var values: [Float] = []

  var count: Int {
    values.count
  }

  func clear() {
    values.removeAll(keepingCapacity: true)
  }

  func append(_ samples: [Float]) {
    values.append(contentsOf: samples)
  }

  func popFront(count: Int) -> [Float] {
    let actual = min(count, values.count)
    let head = Array(values.prefix(actual))
    values.removeFirst(actual)
    return head
  }
}

private final class FloatRingBuffer {
  private var values: [Float]
  private var start = 0
  private var size = 0

  init(capacity: Int) {
    values = Array(repeating: 0, count: max(capacity, 1))
  }

  func clear() {
    start = 0
    size = 0
  }

  func append(_ samples: [Float]) {
    guard !samples.isEmpty else {
      return
    }

    for sample in samples {
      let writeIndex = (start + size) % values.count
      values[writeIndex] = sample

      if size < values.count {
        size += 1
      } else {
        start = (start + 1) % values.count
      }
    }
  }

  func tail(count: Int) -> [Float] {
    guard count > 0, size > 0 else {
      return []
    }

    let actual = min(count, size)
    var output = Array(repeating: Float(0), count: actual)

    let tailStart = (start + size - actual + values.count) % values.count
    for index in 0..<actual {
      output[index] = values[(tailStart + index) % values.count]
    }

    return output
  }
}

private final class MutableFrameBuffer {
  private let maxFrames: Int
  private let frameWidth: Int
  private var frames: [[Float]] = []

  init(maxFrames: Int, frameWidth: Int) {
    self.maxFrames = max(maxFrames, 1)
    self.frameWidth = max(frameWidth, 1)
  }

  var count: Int {
    frames.count
  }

  func clear() {
    frames.removeAll(keepingCapacity: true)
  }

  func append(frame: [Float]) {
    var normalized = frame
    if normalized.count != frameWidth {
      if normalized.count > frameWidth {
        normalized = Array(normalized.prefix(frameWidth))
      } else {
        normalized += Array(repeating: 0, count: frameWidth - normalized.count)
      }
    }

    if frames.count == maxFrames {
      frames.removeFirst()
    }

    frames.append(normalized)
  }

  func append(frames newFrames: [[Float]]) {
    for frame in newFrames {
      append(frame: frame)
    }
  }

  func tailFlatten(frameCount: Int) -> [Float] {
    let actual = min(frameCount, frames.count)
    guard actual > 0 else {
      return []
    }

    let slice = frames.suffix(actual)
    var flattened: [Float] = []
    flattened.reserveCapacity(actual * frameWidth)

    for frame in slice {
      flattened.append(contentsOf: frame)
    }

    return flattened
  }
}

private let sampleRate = 16_000
private let frameSamples = 1_280
private let rawBufferMaxSamples = sampleRate * 10
private let melspectrogramBins = 32
private let melspectrogramWindowFrames = 76
private let melspectrogramContextSamples = 160 * 3
private let melspectrogramMaxFrames = 970
private let embeddingDimension = 96
private let classifierFeatureFrames = 16
private let featureBufferMaxFrames = 120
private let minWarmupFrames = 5
private let inferenceSampleIntervalMs = 1000.0
private let melspectrogramScaleDivisor: Float = 10.0
private let melspectrogramScaleOffset: Float = 2.0
private let defaultMinRmsForDetection = 0.01
private let defaultActivationFrames = 1
private let defaultScoreSmoothingAlpha = 0.35

private let defaultMelspectrogramAssetPath = "openwakeword/melspectrogram.onnx"
private let defaultEmbeddingAssetPath = "openwakeword/embedding_model.onnx"
