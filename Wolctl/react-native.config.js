module.exports = {
  dependencies: {
    'react-native-safe-area-context': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-safe-area-context/android',
          packageImportPath: 'import io.invertase.reactnative.RNCSafeAreaContextPackage;',
        },
      },
    },
    'react-native-screens': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-screens/android',
          packageImportPath: 'import com.swmansion.reanimated.ReanimatedPackage;',
        },
      },
    },
  },
  project: {
    ios: {},
    android: {
      packageName: 'com.netwake.app',
    },
  },
};
