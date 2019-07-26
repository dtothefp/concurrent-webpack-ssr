const { sync: findUp } = require(`find-up`);
const siestaCssPath = `node_modules/@siesta/css`;

module.exports = (ctx) => ({
  parser: ctx.parser ? `sugarss` : false,
  map: ctx.env === `development` ? ctx.map : false,
  plugins: [
    require(`postcss-import`)({
      path: [
        findUp(siestaCssPath, {type: `directory`}),
      ],
    }),
    require(`postcss-custom-properties`),
    require(`postcss-calc`),
    require(`postcss-custom-media`),
    require(`postcss-nested`),
    // TODO: update to user browserlist-config for generating
    // browser specific CSS bundles
    require(`autoprefixer`),
    require(`postcss-discard-comments`),
    require(`postcss-discard-empty`),
  ],
});
