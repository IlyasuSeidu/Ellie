/* eslint-disable @typescript-eslint/no-var-requires */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const postInstallMarker = '[withNonModularHeaders]';
const thirdPartyPodspecMarker = '[withNonModularHeaders:react-native-third-party-podspecs]';

const postInstallPatch = `
    # ${postInstallMarker} Fix static framework module imports under Xcode explicit modules.
    installer.pods_project.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        build_config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
      end
    end

    rnfb_firestore_umbrella = File.join(installer.sandbox.root.to_s, 'Target Support Files', 'RNFBFirestore', 'RNFBFirestore-umbrella.h')
    if File.exist?(rnfb_firestore_umbrella)
      umbrella_contents = File.read(rnfb_firestore_umbrella)
      required_rnfb_app_imports = [
        '#import <RNFBApp/RNFBAppModule.h>',
        '#import <RNFBApp/RCTConvert+FIRApp.h>',
      ]
      unless required_rnfb_app_imports.all? { |rnfb_import| umbrella_contents.include?(rnfb_import) }
        File.write(
          rnfb_firestore_umbrella,
          umbrella_contents.sub(
            '#import "RCTConvert+FIRLoggerLevel.h"',
            required_rnfb_app_imports.join("\\n") + "\\n\\n" + '#import "RCTConvert+FIRLoggerLevel.h"',
          ),
        )
      end
    end
`;

const thirdPartyPodspecs = [
  "  pod 'boost', :podspec => '../node_modules/react-native/third-party-podspecs/boost.podspec'",
  "  pod 'DoubleConversion', :podspec => '../node_modules/react-native/third-party-podspecs/DoubleConversion.podspec'",
  "  pod 'fast_float', :podspec => '../node_modules/react-native/third-party-podspecs/fast_float.podspec'",
  "  pod 'fmt', :podspec => '../node_modules/react-native/third-party-podspecs/fmt.podspec'",
  "  pod 'glog', :podspec => '../node_modules/react-native/third-party-podspecs/glog.podspec'",
  "  pod 'RCT-Folly/Fabric', :podspec => '../node_modules/react-native/third-party-podspecs/RCT-Folly.podspec'",
];

const thirdPartyPodspecPatch = `
  # ${thirdPartyPodspecMarker} Keep voice processor pod resolution local in generated Expo iOS projects.
${thirdPartyPodspecs.join('\n')}
`;

const firestoreHeaders = [
  'RNFBFirestoreCollectionModule.h',
  'RNFBFirestoreCommon.h',
  'RNFBFirestoreDocumentModule.h',
  'RNFBFirestoreModule.h',
  'RNFBFirestoreQuery.h',
  'RNFBFirestoreSerialize.h',
  'RNFBFirestoreTransactionModule.h',
];

const firestoreRNFBAppImports = [
  ['#import <RNFBApp/RNFBRCTEventEmitter.h>', '#import "RNFBRCTEventEmitter.h"'],
  ['#import <RNFBApp/RNFBSharedUtils.h>', '#import "RNFBSharedUtils.h"'],
  ['#import <RNFBApp/RNFBVersion.h>', '#import "RNFBVersion.h"'],
  ['@import RNFBApp.RNFBRCTEventEmitter;', '#import "RNFBRCTEventEmitter.h"'],
  ['@import RNFBApp.RNFBSharedUtils;', '#import "RNFBSharedUtils.h"'],
  ['@import RNFBApp.RNFBVersion;', '#import "RNFBVersion.h"'],
];

async function patchFirestoreHeaderImports(projectRoot) {
  const firestoreHeaderRoot = path.join(
    projectRoot,
    'node_modules',
    '@react-native-firebase',
    'firestore',
    'ios',
    'RNFBFirestore'
  );

  await Promise.all(
    firestoreHeaders.map(async (header) => {
      const headerPath = path.join(firestoreHeaderRoot, header);

      if (!fs.existsSync(headerPath)) {
        return;
      }

      const contents = await fs.promises.readFile(headerPath, 'utf8');
      let patched = contents;
      patched = patched
        .replaceAll('#import "RNFBAppModule.h"\n', '')
        .replaceAll('#import <RNFBApp/RNFBAppModule.h>\n', '')
        .replaceAll('@import RNFBApp.RNFBAppModule;\n', '');

      for (const [from, to] of firestoreRNFBAppImports) {
        patched = patched.replaceAll(from, to);
      }

      if (patched !== contents) {
        await fs.promises.writeFile(headerPath, patched);
      }
    })
  );
}

async function patchFirestoreImplementationImports(projectRoot) {
  const firestoreSourceRoot = path.join(
    projectRoot,
    'node_modules',
    '@react-native-firebase',
    'firestore',
    'ios',
    'RNFBFirestore'
  );

  const entries = await fs.promises.readdir(firestoreSourceRoot, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.(m|mm)$/.test(entry.name))
      .map(async (entry) => {
        const sourcePath = path.join(firestoreSourceRoot, entry.name);
        const contents = await fs.promises.readFile(sourcePath, 'utf8');
        let patched = contents;

        for (const [from, to] of firestoreRNFBAppImports) {
          patched = patched.replaceAll(from, to);
        }

        if (
          patched.includes('#import "RNFBRCTEventEmitter.h"') &&
          !patched.includes('#import <React/RCTBridgeModule.h>\n#import "RNFBRCTEventEmitter.h"')
        ) {
          patched = patched.replace(
            '#import "RNFBRCTEventEmitter.h"',
            '#import <React/RCTBridgeModule.h>\n#import "RNFBRCTEventEmitter.h"'
          );
        }

        const localFirestoreHeaderMatch = patched.match(/#import "RNFBFirestore[^"]+\.h"/);
        if (localFirestoreHeaderMatch) {
          const localHeaderIndex = localFirestoreHeaderMatch.index;
          const bridgeImport = '#import <React/RCTBridgeModule.h>';
          const bridgeIndex = patched.indexOf(bridgeImport);

          if (bridgeIndex === -1 || bridgeIndex > localHeaderIndex) {
            if (bridgeIndex !== -1) {
              patched = patched.replace(`${bridgeImport}\n`, '');
            }

            patched = patched.replace(
              localFirestoreHeaderMatch[0],
              `${bridgeImport}\n${localFirestoreHeaderMatch[0]}`
            );
          }
        }

        if (patched !== contents) {
          await fs.promises.writeFile(sourcePath, patched);
        }
      })
  );
}

function injectThirdPartyPodspecs(contents) {
  if (contents.includes(thirdPartyPodspecMarker)) {
    return contents;
  }

  if (thirdPartyPodspecs.every((podspecLine) => contents.includes(podspecLine.trim()))) {
    return contents;
  }

  const useReactNativeMatch = contents.match(/\n\s+use_react_native!\(/);
  if (!useReactNativeMatch) {
    return contents;
  }

  return `${contents.slice(0, useReactNativeMatch.index)}${thirdPartyPodspecPatch}${contents.slice(
    useReactNativeMatch.index
  )}`;
}

function injectPodfilePatch(contents) {
  if (contents.includes(postInstallMarker)) {
    return contents.replace(
      new RegExp(`    # \\${postInstallMarker}[\\s\\S]*?\\n(?=    react_native_post_install\\()`),
      postInstallPatch
    );
  }

  const postInstallMatch = contents.match(/post_install\s+do\s+\|installer\|/);
  if (!postInstallMatch) {
    return `${contents}\n\npost_install do |installer|\n${postInstallPatch}end\n`;
  }

  const insertPosition = postInstallMatch.index + postInstallMatch[0].length;
  return `${contents.slice(0, insertPosition)}\n${postInstallPatch}${contents.slice(insertPosition)}`;
}

const withNonModularHeaders = (config) =>
  withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');
      const projectRoot = modConfig.modRequest.projectRoot;

      await patchFirestoreHeaderImports(projectRoot);
      await patchFirestoreImplementationImports(projectRoot);

      if (!fs.existsSync(podfilePath)) {
        return modConfig;
      }

      const contents = await fs.promises.readFile(podfilePath, 'utf8');
      const patched = injectPodfilePatch(injectThirdPartyPodspecs(contents));

      if (patched !== contents) {
        await fs.promises.writeFile(podfilePath, patched);
      }

      return modConfig;
    },
  ]);

module.exports = withNonModularHeaders;
module.exports.injectPodfilePatch = injectPodfilePatch;
module.exports.injectThirdPartyPodspecs = injectThirdPartyPodspecs;
module.exports.patchFirestoreHeaderImports = patchFirestoreHeaderImports;
module.exports.patchFirestoreImplementationImports = patchFirestoreImplementationImports;
