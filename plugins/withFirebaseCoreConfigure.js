/* eslint-disable @typescript-eslint/no-var-requires */
const { withAppDelegate } = require('@expo/config-plugins');

function addFirebaseCoreConfigure(contents) {
  let updated = contents;

  if (!updated.includes('import FirebaseCore')) {
    updated = updated.replace('import Expo\n', 'import Expo\nimport FirebaseCore\n');
  }

  if (updated.includes('FirebaseApp.configure()')) {
    return updated;
  }

  const marker =
    '// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY)';
  const markerIndex = updated.indexOf(marker);

  if (markerIndex !== -1) {
    const lineEndIndex = updated.indexOf('\n', markerIndex);
    const insertionIndex = lineEndIndex === -1 ? markerIndex + marker.length : lineEndIndex + 1;
    return `${updated.slice(0, insertionIndex)}    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }
${updated.slice(insertionIndex)}`;
  }

  const fallbackNeedle = '    window = UIWindow(frame: UIScreen.main.bounds)\n';
  if (updated.includes(fallbackNeedle)) {
    return updated.replace(
      fallbackNeedle,
      `${fallbackNeedle}    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }
`
    );
  }

  return updated;
}

module.exports = function withFirebaseCoreConfigure(config) {
  return withAppDelegate(config, (modConfig) => {
    if (modConfig.modResults.language !== 'swift') {
      throw new Error('withFirebaseCoreConfigure only supports Swift AppDelegate files.');
    }

    modConfig.modResults.contents = addFirebaseCoreConfigure(modConfig.modResults.contents);
    return modConfig;
  });
};
