module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4: the worklets plugin replaces react-native-reanimated/plugin.
      // Must remain the LAST plugin in this list.
      'react-native-worklets/plugin',
    ],
  };
};
