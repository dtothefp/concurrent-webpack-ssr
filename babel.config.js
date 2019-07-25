"use strict";

module.exports = (api) => {
  api.cache.forever();

  return {
    presets: [
      `@babel/preset-react`,
      [ `@babel/preset-env`, {
        targets: {
          node: `current`,
        },
      }],
    ],
    plugins: [
      `react-loadable/babel`
    ]
  };
};
