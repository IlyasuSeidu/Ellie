package expo.modules.ellieopenwakeword

import ai.onnxruntime.NodeInfo
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtException
import ai.onnxruntime.OrtSession
import ai.onnxruntime.TensorInfo
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.SystemClock
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.nio.FloatBuffer
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

class EllieOpenWakeWordModule : Module() {
  private val stateLock = Any()

  private var initialized = false
  private var listening = false
  private var keywordLabel = "Hey Ellie"
  private var threshold = 0.45
  private var triggerCooldownMs = 1200L
  private var minRmsForDetection = DEFAULT_MIN_RMS_FOR_DETECTION
  private var activationFrames = DEFAULT_ACTIVATION_FRAMES
  private var scoreSmoothingAlpha = DEFAULT_SCORE_SMOOTHING_ALPHA
  private var lastDetectionTimestamp = 0L
  private var lastInferenceSampleTimestamp = 0L
  private var lastFrameRms = 0.0
  private var smoothedScore: Double? = null
  private var consecutiveTriggerFrames = 0

  private var classifierModelPath: String? = null
  private var melspectrogramModelPath: String? = null
  private var embeddingModelPath: String? = null

  private var ortEnvironment: OrtEnvironment? = null
  private var classifierSession: OrtSession? = null
  private var melspectrogramSession: OrtSession? = null
  private var embeddingSession: OrtSession? = null

  private var classifierInputName = ""
  private var classifierOutputName = ""
  private var melspectrogramInputName = ""
  private var melspectrogramOutputName = ""
  private var embeddingInputName = ""
  private var embeddingOutputName = ""

  private var audioRecord: AudioRecord? = null
  private var inferenceExecutor = Executors.newSingleThreadExecutor()
  private var inferenceTask: Future<*>? = null
  @Volatile private var stopRequested = false

  private val pendingAudio = FloatAccumulationBuffer()
  private val rawAudioBuffer = FloatRingBuffer(RAW_BUFFER_MAX_SAMPLES)
  private val melspectrogramBuffer = MutableFrameBuffer(MELSPECTROGRAM_MAX_FRAMES, MELSPECTROGRAM_BINS)
  private val featureBuffer = MutableFrameBuffer(FEATURE_BUFFER_MAX_FRAMES, EMBEDDING_DIMENSION)
  private var warmupFrames = 0

  override fun definition() = ModuleDefinition {
    Name("EllieOpenWakeWord")

    Events("onWakeWordDetected", "onWakeWordError", "onWakeWordInference")

    Function("isAvailable") {
      true
    }

    Function("isInitialized") {
      initialized
    }

    Function("isListening") {
      listening
    }

    Function("getConfig") {
      mapOf(
        "keywordLabel" to keywordLabel,
        "threshold" to threshold,
        "triggerCooldownMs" to triggerCooldownMs,
        "minRmsForDetection" to minRmsForDetection,
        "activationFrames" to activationFrames,
        "scoreSmoothingAlpha" to scoreSmoothingAlpha,
      )
    }

    AsyncFunction("initialize") { options: Map<String, Any?> ->
      synchronized(stateLock) {
        val context = requireContext()

        val modelPath = resolveModelPath(
          context,
          options["modelPath"] as? String,
          "modelPath",
        )

        val customMelspectrogramPath = (options["melspectrogramModelPath"] as? String)
          ?.trim()
          ?.takeIf { it.isNotEmpty() }

        val customEmbeddingPath = (options["embeddingModelPath"] as? String)
          ?.trim()
          ?.takeIf { it.isNotEmpty() }

        val resolvedMelspectrogramPath = if (customMelspectrogramPath != null) {
          resolveModelPath(context, customMelspectrogramPath, "melspectrogramModelPath")
        } else {
          resolveBundledFeatureModelPath(context, DEFAULT_MELSPECTROGRAM_ASSET_PATH)
            ?: throw IllegalStateException(
              "Missing bundled melspectrogram model. Rebuild native app with updated module assets."
            )
        }

        val resolvedEmbeddingPath = if (customEmbeddingPath != null) {
          resolveModelPath(context, customEmbeddingPath, "embeddingModelPath")
        } else {
          resolveBundledFeatureModelPath(context, DEFAULT_EMBEDDING_ASSET_PATH)
            ?: throw IllegalStateException(
              "Missing bundled embedding model. Rebuild native app with updated module assets."
            )
        }

        keywordLabel = (options["keywordLabel"] as? String)
          ?.takeIf { it.isNotBlank() }
          ?: "Hey Ellie"
        threshold = ((options["threshold"] as? Number)?.toDouble() ?: 0.45).coerceIn(0.0, 1.0)
        triggerCooldownMs = ((options["triggerCooldownMs"] as? Number)?.toLong() ?: 1200L).coerceAtLeast(0L)
        minRmsForDetection = ((options["minRmsForDetection"] as? Number)?.toDouble()
          ?: DEFAULT_MIN_RMS_FOR_DETECTION).coerceIn(0.0, 1.0)
        activationFrames = ((options["activationFrames"] as? Number)?.toInt()
          ?: DEFAULT_ACTIVATION_FRAMES).coerceAtLeast(1)
        scoreSmoothingAlpha = ((options["scoreSmoothingAlpha"] as? Number)?.toDouble()
          ?: DEFAULT_SCORE_SMOOTHING_ALPHA).coerceIn(0.0, 1.0)

        stopListeningLocked(waitForStop = true)
        destroySessionsLocked()

        classifierModelPath = modelPath
        melspectrogramModelPath = resolvedMelspectrogramPath
        embeddingModelPath = resolvedEmbeddingPath

        initializeSessionsLocked()

        initialized = true
        listening = false
        lastDetectionTimestamp = 0L
        lastInferenceSampleTimestamp = 0L
        lastFrameRms = 0.0
        smoothedScore = null
        consecutiveTriggerFrames = 0
        resetStreamingStateLocked()
      }
    }

    AsyncFunction("start") {
      synchronized(stateLock) {
        ensureInitializedLocked()
        if (listening) {
          return@synchronized
        }

        val context = requireContext()
        if (!hasRecordAudioPermission(context)) {
          throw IllegalStateException("RECORD_AUDIO permission is required for wake-word detection")
        }

        startListeningLocked(context)
      }
    }

    AsyncFunction("stop") {
      synchronized(stateLock) {
        stopListeningLocked(waitForStop = true)
      }
    }

    AsyncFunction("destroy") {
      synchronized(stateLock) {
        stopListeningLocked(waitForStop = true)
        destroySessionsLocked()
        initialized = false
        listening = false
        lastDetectionTimestamp = 0L
        lastInferenceSampleTimestamp = 0L
        lastFrameRms = 0.0
        smoothedScore = null
        consecutiveTriggerFrames = 0
        resetStreamingStateLocked()
      }
    }

    AsyncFunction("simulateDetection") { score: Double? ->
      synchronized(stateLock) {
        if (!listening) {
          return@AsyncFunction
        }

        val normalizedScore = score ?: 0.95
        maybeEmitDetectionLocked(normalizedScore)
      }
    }
  }

  private fun ensureInitializedLocked() {
    if (!initialized || classifierSession == null || melspectrogramSession == null || embeddingSession == null) {
      throw IllegalStateException("OpenWakeWord module is not initialized")
    }
  }

  private fun startListeningLocked(context: Context) {
    ensureInitializedLocked()

    val minBufferSize = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
    )

    if (minBufferSize <= 0) {
      throw IllegalStateException("Failed to determine audio buffer size")
    }

    val targetBufferSize = max(minBufferSize, FRAME_SAMPLES * BYTES_PER_PCM16_SAMPLE * 6)

    val record = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION,
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      targetBufferSize,
    )

    if (record.state != AudioRecord.STATE_INITIALIZED) {
      record.release()
      throw IllegalStateException("Failed to initialize microphone stream for wake-word detection")
    }

    stopRequested = false
    resetStreamingStateLocked()

    if (inferenceExecutor.isShutdown || inferenceExecutor.isTerminated) {
      inferenceExecutor = Executors.newSingleThreadExecutor()
    }

    try {
      record.startRecording()
    } catch (error: Exception) {
      record.release()
      throw IllegalStateException(
        "Failed to start microphone for wake-word detection: ${error.message}",
        error,
      )
    }

    if (record.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
      record.release()
      throw IllegalStateException("Microphone did not enter recording state")
    }

    audioRecord = record
    listening = true

    inferenceTask = inferenceExecutor.submit {
      runAudioInferenceLoop(record)
    }
  }

  private fun stopListeningLocked(waitForStop: Boolean) {
    stopRequested = true

    audioRecord?.let { record ->
      try {
        if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
          record.stop()
        }
      } catch (_: Exception) {
        // no-op
      }
    }

    if (waitForStop) {
      val task = inferenceTask
      if (task != null && !task.isDone) {
        try {
          task.get(2, TimeUnit.SECONDS)
        } catch (_: Exception) {
          task.cancel(true)
        }
      }
    }

    inferenceTask = null

    audioRecord?.let { record ->
      try {
        record.release()
      } catch (_: Exception) {
        // no-op
      }
    }

    audioRecord = null
    listening = false
  }

  private fun runAudioInferenceLoop(record: AudioRecord) {
    val pcmBuffer = ShortArray(READ_BUFFER_SAMPLES)

    try {
      while (!stopRequested) {
        val readCount = record.read(pcmBuffer, 0, pcmBuffer.size, AudioRecord.READ_BLOCKING)
        if (readCount == AudioRecord.ERROR_INVALID_OPERATION || readCount == AudioRecord.ERROR_BAD_VALUE) {
          emitWakeWordError(
            code = "audio_record_error",
            message = "Microphone stream returned error code $readCount",
          )
          break
        }

        if (readCount <= 0) {
          continue
        }

        val chunk = FloatArray(readCount)
        for (i in 0 until readCount) {
          chunk[i] = pcmBuffer[i].toFloat()
        }

        pendingAudio.append(chunk, readCount)

        while (pendingAudio.size >= FRAME_SAMPLES) {
          val frame = pendingAudio.popFront(FRAME_SAMPLES)
          processFrame(frame)
        }
      }
    } catch (error: Exception) {
      emitWakeWordError(
        code = "inference_runtime_error",
        message = "Wake-word inference loop failed: ${error.message}",
      )
    } finally {
      synchronized(stateLock) {
        try {
          if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
            record.stop()
          }
        } catch (_: Exception) {
          // no-op
        }

        try {
          record.release()
        } catch (_: Exception) {
          // no-op
        }

        if (audioRecord === record) {
          audioRecord = null
        }

        listening = false
        inferenceTask = null
      }
    }
  }

  private fun processFrame(frame: FloatArray) {
    lastFrameRms = computeNormalizedRms(frame)
    rawAudioBuffer.append(frame)

    val melspectrogramInput = rawAudioBuffer.tail(FRAME_SAMPLES + MELSPECTROGRAM_CONTEXT_SAMPLES)
    if (melspectrogramInput.isEmpty()) {
      return
    }

    val melFrames = runMelspectrogramInference(melspectrogramInput)
    if (melFrames.isEmpty()) {
      return
    }

    melspectrogramBuffer.appendFrames(melFrames)

    if (melspectrogramBuffer.size < MELSPECTROGRAM_WINDOW_FRAMES) {
      return
    }

    val embeddingInput = melspectrogramBuffer.tailFlatten(MELSPECTROGRAM_WINDOW_FRAMES)
    val embeddingVector = runEmbeddingInference(embeddingInput)

    featureBuffer.appendFrame(embeddingVector)
    if (featureBuffer.size < CLASSIFIER_FEATURE_FRAMES) {
      return
    }

    val classifierInput = featureBuffer.tailFlatten(CLASSIFIER_FEATURE_FRAMES)
    val score = runClassifierInference(classifierInput)

    synchronized(stateLock) {
      if (!listening || stopRequested) {
        return
      }

      maybeEmitInferenceSampleLocked(score)

      if (warmupFrames < MIN_WARMUP_FRAMES) {
        warmupFrames += 1
        return
      }

      maybeEmitDetectionLocked(score)
    }
  }

  private fun runMelspectrogramInference(inputSamples: FloatArray): List<FloatArray> {
    val env = requireNotNull(ortEnvironment)
    val session = requireNotNull(melspectrogramSession)

    val tensorShape = longArrayOf(1, inputSamples.size.toLong())
    val inputTensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(inputSamples), tensorShape)

    inputTensor.use { tensor ->
      session.run(mapOf(melspectrogramInputName to tensor)).use { result ->
        val outputValue = result.get(0)
        if (outputValue !is OnnxTensor) {
          throw IllegalStateException("Melspectrogram model output was not a tensor")
        }

        return extractFrames(outputValue, MELSPECTROGRAM_BINS)
      }
    }
  }

  private fun runEmbeddingInference(inputFrames: FloatArray): FloatArray {
    val env = requireNotNull(ortEnvironment)
    val session = requireNotNull(embeddingSession)

    val tensorShape = longArrayOf(1, MELSPECTROGRAM_WINDOW_FRAMES.toLong(), MELSPECTROGRAM_BINS.toLong(), 1)
    val inputTensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(inputFrames), tensorShape)

    inputTensor.use { tensor ->
      session.run(mapOf(embeddingInputName to tensor)).use { result ->
        val outputValue = result.get(0)
        if (outputValue !is OnnxTensor) {
          throw IllegalStateException("Embedding model output was not a tensor")
        }

        val flatOutput = outputValue.floatBuffer?.let { floatBuffer ->
          val out = FloatArray(floatBuffer.remaining())
          floatBuffer.get(out)
          out
        } ?: throw IllegalStateException("Embedding model returned non-float output")

        if (flatOutput.isEmpty()) {
          throw IllegalStateException("Embedding model returned empty output")
        }

        val vectorSize = min(EMBEDDING_DIMENSION, flatOutput.size)
        val embedding = FloatArray(EMBEDDING_DIMENSION)
        System.arraycopy(flatOutput, flatOutput.size - vectorSize, embedding, EMBEDDING_DIMENSION - vectorSize, vectorSize)
        return embedding
      }
    }
  }

  private fun runClassifierInference(inputFeatures: FloatArray): Double {
    val env = requireNotNull(ortEnvironment)
    val session = requireNotNull(classifierSession)

    val tensorShape = longArrayOf(1, CLASSIFIER_FEATURE_FRAMES.toLong(), EMBEDDING_DIMENSION.toLong())
    val inputTensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(inputFeatures), tensorShape)

    inputTensor.use { tensor ->
      session.run(mapOf(classifierInputName to tensor)).use { result ->
        val outputValue = result.get(0)
        if (outputValue !is OnnxTensor) {
          throw IllegalStateException("Classifier output was not a tensor")
        }

        val outputBuffer = outputValue.floatBuffer
          ?: throw IllegalStateException("Classifier output was not float tensor")

        val values = FloatArray(outputBuffer.remaining())
        outputBuffer.get(values)

        if (values.isEmpty()) {
          return 0.0
        }

        val rawScore = if (values.size == 1) {
          values[0].toDouble()
        } else {
          var best = Double.NEGATIVE_INFINITY
          for (index in 1 until values.size) {
            best = max(best, values[index].toDouble())
          }
          if (best == Double.NEGATIVE_INFINITY) values[0].toDouble() else best
        }

        return normalizeScore(rawScore)
      }
    }
  }

  private fun normalizeScore(value: Double): Double {
    if (value.isNaN()) {
      return 0.0
    }

    return when {
      value in 0.0..1.0 -> value
      else -> 1.0 / (1.0 + exp(-value))
    }
  }

  private fun maybeEmitDetectionLocked(score: Double) {
    val effectiveScore = updateSmoothedScoreLocked(score)
    val hasVoiceEnergy = lastFrameRms >= minRmsForDetection
    val thresholdMatched = effectiveScore >= threshold

    consecutiveTriggerFrames = if (thresholdMatched && hasVoiceEnergy) {
      min(activationFrames, consecutiveTriggerFrames + 1)
    } else {
      0
    }

    if (consecutiveTriggerFrames < activationFrames) {
      return
    }

    val now = SystemClock.elapsedRealtime()
    if (now - lastDetectionTimestamp < triggerCooldownMs) {
      return
    }

    lastDetectionTimestamp = now
    consecutiveTriggerFrames = 0

    sendEvent(
      "onWakeWordDetected",
      mapOf(
        "keywordLabel" to keywordLabel,
        "score" to effectiveScore,
        "rawScore" to score,
        "timestamp" to System.currentTimeMillis(),
      ),
    )
  }

  private fun maybeEmitInferenceSampleLocked(score: Double) {
    val now = SystemClock.elapsedRealtime()
    if (now - lastInferenceSampleTimestamp < INFERENCE_SAMPLE_INTERVAL_MS) {
      return
    }

    lastInferenceSampleTimestamp = now
    sendEvent(
      "onWakeWordInference",
      mapOf(
        "score" to score,
        "smoothedScore" to smoothedScore,
        "threshold" to threshold,
        "rms" to lastFrameRms,
        "minRmsForDetection" to minRmsForDetection,
        "activationFrames" to activationFrames,
        "consecutiveTriggerFrames" to consecutiveTriggerFrames,
        "timestamp" to System.currentTimeMillis(),
      ),
    )
  }

  private fun updateSmoothedScoreLocked(score: Double): Double {
    if (!java.lang.Double.isFinite(score)) {
      return smoothedScore ?: 0.0
    }

    if (scoreSmoothingAlpha <= 0.0 || scoreSmoothingAlpha >= 1.0) {
      smoothedScore = score
      return score
    }

    val previous = smoothedScore
    val nextScore = if (previous == null || !java.lang.Double.isFinite(previous)) {
      score
    } else {
      (scoreSmoothingAlpha * score) + ((1.0 - scoreSmoothingAlpha) * previous)
    }

    smoothedScore = nextScore
    return nextScore
  }

  private fun computeNormalizedRms(frame: FloatArray): Double {
    if (frame.isEmpty()) {
      return 0.0
    }

    var sumSquares = 0.0
    for (sample in frame) {
      val normalized = sample / 32768.0
      sumSquares += normalized * normalized
    }

    return kotlin.math.sqrt(sumSquares / frame.size).coerceIn(0.0, 1.0)
  }

  private fun initializeSessionsLocked() {
    val classifierPath = requireNotNull(classifierModelPath)
    val melPath = requireNotNull(melspectrogramModelPath)
    val embeddingPath = requireNotNull(embeddingModelPath)

    try {
      val env = OrtEnvironment.getEnvironment()
      ortEnvironment = env

      OrtSession.SessionOptions().use { options ->
        options.setInterOpNumThreads(1)
        options.setIntraOpNumThreads(1)

        melspectrogramSession = env.createSession(melPath, options)
        embeddingSession = env.createSession(embeddingPath, options)
        classifierSession = env.createSession(classifierPath, options)
      }

      melspectrogramInputName = requirePrimaryInputName(melspectrogramSession, "melspectrogram")
      melspectrogramOutputName = requirePrimaryOutputName(melspectrogramSession, "melspectrogram")

      embeddingInputName = requirePrimaryInputName(embeddingSession, "embedding")
      embeddingOutputName = requirePrimaryOutputName(embeddingSession, "embedding")

      classifierInputName = requirePrimaryInputName(classifierSession, "classifier")
      classifierOutputName = requirePrimaryOutputName(classifierSession, "classifier")

      validateClassifierInputShape(classifierSession, classifierInputName)
    } catch (error: Exception) {
      destroySessionsLocked()
      throw IllegalStateException(
        "Failed to initialize OpenWakeWord ONNX pipeline: ${error.message}",
        error,
      )
    }
  }

  private fun validateClassifierInputShape(session: OrtSession?, inputName: String) {
    val classifier = session ?: return

    try {
      val inputInfo = classifier.inputInfo[inputName]
      val tensorInfo = (inputInfo as? NodeInfo)?.info as? TensorInfo
      val inputShape = tensorInfo?.shape ?: return

      if (inputShape.size < 3) {
        throw IllegalArgumentException(
          "Classifier model input shape is incompatible (${inputShape.contentToString()}); expected [...,16,96]"
        )
      }

      val featureFrames = inputShape[inputShape.size - 2]
      val featureDims = inputShape[inputShape.size - 1]

      val featureFramesCompatible = featureFrames <= 0 || featureFrames.toInt() == CLASSIFIER_FEATURE_FRAMES
      val featureDimsCompatible = featureDims <= 0 || featureDims.toInt() == EMBEDDING_DIMENSION

      if (!featureFramesCompatible || !featureDimsCompatible) {
        throw IllegalArgumentException(
          "Classifier model input shape ${inputShape.contentToString()} is incompatible; expected last dims [16, 96]"
        )
      }
    } catch (error: OrtException) {
      throw IllegalStateException("Failed to inspect classifier model input shape", error)
    }
  }

  private fun requirePrimaryInputName(session: OrtSession?, label: String): String {
    val modelSession = session ?: throw IllegalStateException("Missing $label session")
    return modelSession.inputNames.firstOrNull()
      ?: throw IllegalStateException("$label model has no input node")
  }

  private fun requirePrimaryOutputName(session: OrtSession?, label: String): String {
    val modelSession = session ?: throw IllegalStateException("Missing $label session")
    return modelSession.outputNames.firstOrNull()
      ?: throw IllegalStateException("$label model has no output node")
  }

  private fun destroySessionsLocked() {
    try {
      classifierSession?.close()
    } catch (_: Exception) {
      // no-op
    }

    try {
      melspectrogramSession?.close()
    } catch (_: Exception) {
      // no-op
    }

    try {
      embeddingSession?.close()
    } catch (_: Exception) {
      // no-op
    }

    classifierSession = null
    melspectrogramSession = null
    embeddingSession = null

    classifierInputName = ""
    classifierOutputName = ""
    melspectrogramInputName = ""
    melspectrogramOutputName = ""
    embeddingInputName = ""
    embeddingOutputName = ""
  }

  private fun resetStreamingStateLocked() {
    pendingAudio.clear()
    rawAudioBuffer.clear()

    melspectrogramBuffer.clear()
    repeat(MELSPECTROGRAM_WINDOW_FRAMES) {
      melspectrogramBuffer.appendFrame(FloatArray(MELSPECTROGRAM_BINS) { 1f })
    }

    featureBuffer.clear()
    warmupFrames = 0
    smoothedScore = null
    consecutiveTriggerFrames = 0
  }

  private fun resolveModelPath(context: Context, configuredPath: String?, optionName: String): String {
    val path = configuredPath?.trim()
      ?: throw IllegalArgumentException("$optionName is required")

    if (path.isEmpty()) {
      throw IllegalArgumentException("$optionName must not be empty")
    }

    val normalizedPath = if (path.startsWith("file://")) {
      path.removePrefix("file://")
    } else {
      path
    }

    val directFile = File(normalizedPath)
    if (directFile.exists()) {
      return directFile.absolutePath
    }

    copyAssetToCache(context, normalizedPath)?.let {
      return it.absolutePath
    }

    val filesDirCandidate = File(context.filesDir, normalizedPath)
    if (filesDirCandidate.exists()) {
      return filesDirCandidate.absolutePath
    }

    val cacheDirCandidate = File(context.cacheDir, normalizedPath)
    if (cacheDirCandidate.exists()) {
      return cacheDirCandidate.absolutePath
    }

    throw IllegalArgumentException("$optionName does not exist at '$path'")
  }

  private fun resolveBundledFeatureModelPath(context: Context, assetPath: String): String? {
    return copyAssetToCache(context, assetPath)?.absolutePath
  }

  private fun copyAssetToCache(context: Context, assetPath: String): File? {
    val normalizedAssetPath = assetPath.trim().removePrefix("/")
    if (normalizedAssetPath.isEmpty()) {
      return null
    }

    return try {
      context.assets.open(normalizedAssetPath).use { inputStream ->
        val targetDirectory = File(context.cacheDir, "ellie-openwakeword-models")
        if (!targetDirectory.exists()) {
          targetDirectory.mkdirs()
        }

        val safeFileName = normalizedAssetPath.replace("/", "_")
        val targetFile = File(targetDirectory, safeFileName)

        if (!targetFile.exists() || targetFile.length() == 0L) {
          FileOutputStream(targetFile).use { outputStream ->
            inputStream.copyTo(outputStream)
          }
        }

        targetFile
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun hasRecordAudioPermission(context: Context): Boolean {
    return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
      PackageManager.PERMISSION_GRANTED
  }

  private fun requireContext(): Context {
    return appContext.reactContext
      ?: throw IllegalStateException("React context is unavailable")
  }

  private fun emitWakeWordError(code: String, message: String) {
    sendEvent(
      "onWakeWordError",
      mapOf(
        "code" to code,
        "message" to message,
      ),
    )
  }

  private fun extractFrames(tensor: OnnxTensor, frameWidth: Int): List<FloatArray> {
    val floatBuffer = tensor.floatBuffer
      ?: throw IllegalStateException("Expected float output tensor")

    val values = FloatArray(floatBuffer.remaining())
    floatBuffer.get(values)

    if (values.isEmpty()) {
      return emptyList()
    }

    val info = tensor.info as? TensorInfo
    val inferredFrameWidth = info?.shape?.lastOrNull()?.takeIf { it > 0 }?.toInt() ?: frameWidth
    val resolvedFrameWidth = if (inferredFrameWidth > 0) inferredFrameWidth else frameWidth

    val frameCount = max(1, values.size / resolvedFrameWidth)
    val frames = ArrayList<FloatArray>(frameCount)

    var offset = 0
    repeat(frameCount) {
      if (offset >= values.size) {
        return@repeat
      }

      val frame = FloatArray(resolvedFrameWidth)
      val copyLength = min(resolvedFrameWidth, values.size - offset)
      System.arraycopy(values, offset, frame, 0, copyLength)
      // Match OpenWakeWord Python preprocessing: spec = spec / 10 + 2.
      for (index in frame.indices) {
        frame[index] = (frame[index] / MELSPECTROGRAM_SCALE_DIVISOR) + MELSPECTROGRAM_SCALE_OFFSET
      }
      frames.add(frame)
      offset += resolvedFrameWidth
    }

    return frames
  }

  companion object {
    private const val SAMPLE_RATE = 16_000
    private const val FRAME_SAMPLES = 1_280
    private const val BYTES_PER_PCM16_SAMPLE = 2
    private const val READ_BUFFER_SAMPLES = 2_560
    private const val RAW_BUFFER_MAX_SAMPLES = SAMPLE_RATE * 10
    private const val MELSPECTROGRAM_BINS = 32
    private const val MELSPECTROGRAM_WINDOW_FRAMES = 76
    private const val MELSPECTROGRAM_CONTEXT_SAMPLES = 160 * 3
    private const val MELSPECTROGRAM_MAX_FRAMES = 970
    private const val EMBEDDING_DIMENSION = 96
    private const val CLASSIFIER_FEATURE_FRAMES = 16
    private const val FEATURE_BUFFER_MAX_FRAMES = 120
    private const val MIN_WARMUP_FRAMES = 5
    private const val INFERENCE_SAMPLE_INTERVAL_MS = 1_000L
    private const val MELSPECTROGRAM_SCALE_DIVISOR = 10f
    private const val MELSPECTROGRAM_SCALE_OFFSET = 2f
    private const val DEFAULT_MIN_RMS_FOR_DETECTION = 0.0025
    private const val DEFAULT_ACTIVATION_FRAMES = 3
    private const val DEFAULT_SCORE_SMOOTHING_ALPHA = 0.35

    private const val DEFAULT_MELSPECTROGRAM_ASSET_PATH = "openwakeword/melspectrogram.onnx"
    private const val DEFAULT_EMBEDDING_ASSET_PATH = "openwakeword/embedding_model.onnx"
  }
}

private class FloatAccumulationBuffer(initialCapacity: Int = 4_096) {
  private var data = FloatArray(initialCapacity)
  var size: Int = 0
    private set

  fun clear() {
    size = 0
  }

  fun append(input: FloatArray, length: Int = input.size) {
    if (length <= 0) {
      return
    }

    ensureCapacity(size + length)
    System.arraycopy(input, 0, data, size, length)
    size += length
  }

  fun popFront(count: Int): FloatArray {
    val actual = min(count, size)
    val output = FloatArray(actual)
    System.arraycopy(data, 0, output, 0, actual)

    val remaining = size - actual
    if (remaining > 0) {
      System.arraycopy(data, actual, data, 0, remaining)
    }

    size = remaining
    return output
  }

  private fun ensureCapacity(requiredCapacity: Int) {
    if (requiredCapacity <= data.size) {
      return
    }

    var nextCapacity = data.size
    while (nextCapacity < requiredCapacity) {
      nextCapacity *= 2
    }

    data = data.copyOf(nextCapacity)
  }
}

private class FloatRingBuffer(private val capacity: Int) {
  private val values = FloatArray(capacity)
  private var start = 0
  private var size = 0

  fun clear() {
    start = 0
    size = 0
  }

  fun append(samples: FloatArray) {
    for (sample in samples) {
      val writeIndex = (start + size) % capacity
      values[writeIndex] = sample

      if (size < capacity) {
        size += 1
      } else {
        start = (start + 1) % capacity
      }
    }
  }

  fun tail(count: Int): FloatArray {
    if (count <= 0 || size == 0) {
      return FloatArray(0)
    }

    val actual = min(count, size)
    val output = FloatArray(actual)
    val tailStart = (start + size - actual + capacity) % capacity

    for (i in 0 until actual) {
      output[i] = values[(tailStart + i) % capacity]
    }

    return output
  }
}

private class MutableFrameBuffer(
  private val maxFrames: Int,
  private val frameWidth: Int,
) {
  private val frames = ArrayDeque<FloatArray>(maxFrames)

  val size: Int
    get() = frames.size

  fun clear() {
    frames.clear()
  }

  fun appendFrame(frame: FloatArray) {
    val normalizedFrame = if (frame.size == frameWidth) {
      frame.copyOf()
    } else {
      val resized = FloatArray(frameWidth)
      val copyLength = min(frameWidth, frame.size)
      System.arraycopy(frame, 0, resized, 0, copyLength)
      resized
    }

    if (frames.size == maxFrames) {
      frames.removeFirst()
    }

    frames.addLast(normalizedFrame)
  }

  fun appendFrames(newFrames: List<FloatArray>) {
    for (frame in newFrames) {
      appendFrame(frame)
    }
  }

  fun tailFlatten(frameCount: Int): FloatArray {
    val actualCount = min(frameCount, frames.size)
    if (actualCount <= 0) {
      return FloatArray(0)
    }

    val flattened = FloatArray(actualCount * frameWidth)
    val startIndex = frames.size - actualCount

    var offset = 0
    for (index in startIndex until frames.size) {
      val frame = frames.elementAt(index)
      System.arraycopy(frame, 0, flattened, offset, frameWidth)
      offset += frameWidth
    }

    return flattened
  }
}
