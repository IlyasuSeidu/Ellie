module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/utils': './src/utils',
            '@/hooks': './src/hooks',
            '@/services': './src/services',
            '@/types': './src/types',
            '@/constants': './src/constants',
            '@/config': './src/config',
            '@/navigation': './src/navigation',
            '@/contexts': './src/contexts',
            '@/assets': './assets',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
