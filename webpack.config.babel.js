import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import HtmlWebPackPlugin from 'html-webpack-plugin';

const WebpackBar = require(`webpackbar`);
const StartServerPlugin = require(`start-server-webpack-plugin`);
const nodeExternals = require(`webpack-node-externals`);
const { ReactLoadablePlugin } = require(`react-loadable/webpack`);
const AssetsPlugin = require(`assets-webpack-plugin`);
const {sync: findUp} = require(`find-up`);
const ExtractCssChunks = require(`extract-css-chunks-webpack-plugin`);
const errorOverlayMiddleware = require(`react-dev-utils/errorOverlayMiddleware`);

const dest = `dist`;
const base = path.join.bind(path, process.cwd());
const {NODE_ENV} = process.env;
const IS_DEV = NODE_ENV === `development`;
const IS_PROD = NODE_ENV === `production`;

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);
const appNodeModules = findUp(`node_modules`, {type: `directory`});
const postcssConfigPath = findUp(`postcss.config.js`, {
  cwd: path.resolve(__dirname),
});
const postcssLoaderOptions = {};
const postcssOptionsConfig = {
  ...postcssLoaderOptions,
  config: {
    path: postcssConfigPath,
  },
};

const nodePaths = (process.env.NODE_PATH || ``)
  .split(process.platform === `win32` ? `;` : `:`)
  .filter(Boolean)
  .filter((folder) => !path.isAbsolute(folder))
  .map(resolveApp);

const paths = {
  dotenv: resolveApp(`.env`),
  appPath: resolveApp(`.`),
  appBuild: resolveApp(`dist`),
  appBuildPublic: resolveApp(`dist/public`),
  appManifest: resolveApp(`dist/assets.json`),
  appLoadable: resolveApp(`dist/react-loadable.json`),
  appPublic: resolveApp(`public`),
  appNodeModules: resolveApp(`node_modules`),
  appSrc: resolveApp(`src`),
  appPackageJson: resolveApp(`package.json`),
  appServerIndexJs: resolveApp(`src/server/index.js`),
  appClientIndexJs: resolveApp(`src/main.js`),
  nodePaths,
};

const targets = {};
const evergreenBrowsers = [
  `and_chr >= 60`,
  `and_ff >= 60`,
  `chrome >= 60`,
  `firefox >= 60`,
  `ios_saf >= 11.3`,
  `safari >= 12`,
  `samsung >= 8.2`,
  `opera >= 55`,
];

targets.browsers = evergreenBrowsers;

const cwd = path.join.bind(path, process.cwd());

const modules = [`node_modules`].concat(
  path.dirname(appNodeModules) !== cwd() ? appNodeModules : [],
);

const host = `0.0.0.0`;
const port = `8080`;
// VMs, Docker containers might not be available at localhost:3001. CLIENT_PUBLIC_PATH can override.
const publicPath = IS_DEV ? `http://${host}:${port}/` : `/`;

const clientConfig = {
  entry: {
    client: [
      `react-hot-loader/patch`,
      paths.appClientIndexJs,
    ],
  },
  output: {
    path: paths.appBuildPublic,
    publicPath,
    pathinfo: true,
    filename: `static/js/bundle.js`,
    chunkFilename: `static/js/[name].chunk.js`,
    // we do `export.default` in main.js so we can load scripts async. when the queue for scripts being loaded
    // in server.js is consumed then we call `window.MAIN`
    library: [`MAIN`],
    libraryExport: `default`,
  },
  module: {
    strictExportPresence: true,
    rules: [
      // Transform ES6 with Babel
      {
        test: /\.(js|jsx|mjs)$/,
        include: [paths.appSrc],
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve(`babel-loader`),
            options: {
              babelrc: false,
              presets: [
                `@babel/preset-react`,
                [ `@babel/preset-env`, {
                  modules: false,
                  targets,
                }],
              ],
              plugins: [
                [ `styled-components`, {
                  ssr: true,
                  displayName: true,
                  fileName: IS_PROD,
                }],
                `@babel/plugin-syntax-dynamic-import`,
                `react-hot-loader/babel`,
                `react-loadable/babel`,
                [ `@babel/plugin-transform-runtime`, {
                  helpers: true,
                  // we handle this with babel-polyfill
                  corejs: false,
                  useESModules: true,
                  // we handle this with babel-polyfill
                  regenerator: false,
                }],
              ],
            },
          },
        ],
      },
      {
        test: /src\/css\/\.css$/,
        exclude: [paths.appBuild],
        use: [
          {
            loader:ExtractCssChunks.loader,
            options: {
              hot: IS_DEV, // if you want HMR
              reloadAll: process.env.HMR === `all`, // when desperation kicks in - this is a brute force HMR flag
            },
          },
          {
            loader: require.resolve(`css-loader`),
            options: {
              importLoaders: 1,
              modules: false,
            },
          },
          {
            loader: require.resolve(`postcss-loader`),
            options: postcssOptionsConfig,
          },
        ],
      },
      // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
      // using the extension .module.css
      {
        test: /\.css$/,
        exclude: [ paths.appBuild, /css\/\.css$/ ],
        use: [
          {
            loader:ExtractCssChunks.loader,
            options: {
              hot: IS_DEV, // if you want HMR
              reloadAll: process.env.HMR === `all`, // when desperation kicks in - this is a brute force HMR flag
            },
          },
          {
            loader: require.resolve(`css-loader`),
            options: {
              modules: {
                mode: 'local',
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
              },
              importLoaders: 1,
            },
          },
          {
            loader: require.resolve(`postcss-loader`),
            options: postcssOptionsConfig,
          },
        ],
      },
      {
        exclude: [
          /\.html$/,
          /\.(js|jsx|mjs)$/,
          /\.(s?css|sass)$/,
          /\.json$/,
          /\.bmp$/,
          /\.gif$/,
          /\.jpe?g$/,
          /\.png$/,
        ],
        loader: require.resolve(`file-loader`),
        options: {
          name: `static/media/[name].[hash:8].[ext]`,
          emitFile: true,
        },
      },
      // "url" loader works like "file" loader except that it embeds assets
      // smaller than specified limit in bytes as data URLs to avoid requests.
      // A missing `test` is equivalent to a match.
      {
        test: [ /\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/ ],
        loader: require.resolve(`url-loader`),
        options: {
          limit: 10000,
          name: `static/media/[name].[hash:8].[ext]`,
          emitFile: true,
        },
      },
    ],
  },
  optimization: {
    minimize: false,
    splitChunks: {
      chunks: `all`,
      cacheGroups: {
        default: false,
        vendors: false,
        styles: {
          name: `styles`,
          test: new RegExp(`\\.+(css)$`),
          chunks: `all`,
          enforce: true,
        },
      },
    },
  },
  mode: NODE_ENV,
  context: cwd(),
  // Specify target (either 'node' or 'web')
  target: `web`,
  // Controversially, decide on sourcemaps.
  devtool: IS_DEV ? `cheap-module-source-map` : `source-map`,
  // We need to tell webpack how to resolve both Razzle's node_modules and
  // the users', so we use resolve and resolveLoader.
  resolve: {
    modules: [
      ...modules,
      findUp(path.join(`node_modules`, `@siesta`, `css`), {type: `directory`}),
    ],
    extensions: [ `.jsx`, `.js`, `.json`, `.css` ],
    alias: {
      // This is required so symlinks work during development.
      'webpack/hot/poll': require.resolve(`webpack/hot/poll`),
      'react-dom': `@hot-loader/react-dom`,
    },
  },
  resolveLoader: {
    modules,
  },
  plugins: [
    new webpack.EnvironmentPlugin([`NODE_ENV`]),
    new HtmlWebPackPlugin({
      template: base(`src`, `index.html`),
    }),
    new AssetsPlugin({
      path: paths.appBuild,
      filename: `assets.json`,
    }),
    new ExtractCssChunks({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: IS_DEV
        ? `static/chunks/[name].css`
        : `static/chunks/[name].[contenthash:8].css`,
      chunkFilename: IS_DEV
        ? `static/chunks/[name].chunk.css`
        : `static/chunks/[name].[contenthash:8].chunk.css`,
      hot: IS_DEV,
      orderWarning: true, // Disable to remove warnings about conflicting order between imports
    }),
    // TODO: breaks webpack HTML plugin
    new webpack.HotModuleReplacementPlugin({
      // multiStep: true,
    }),
    new ReactLoadablePlugin({
      filename: paths.appLoadable,
    }),
    new WebpackBar({
      color: `#f56be2`,
      name: `client`,
    }),
  ],
  devServer: {
    serverSideRender: true,
    disableHostCheck: true,
    clientLogLevel: `none`,
    // Enable gzip compression of generated files.
    compress: true,
    // watchContentBase: true,
    headers: {
      'Access-Control-Allow-Origin': `*`,
    },
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebookincubator/create-react-app/issues/387.
      disableDotRule: true,
    },
    host,
    hot: true,
    // noInfo: true,
    overlay: false,
    port,
    // quiet: true,
    // By default files from `contentBase` will not trigger a page reload.
    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebookincubator/create-react-app/issues/293
    // watchOptions: {
    // ignored: /node_modules/,
    // },
    before(app) {
      // This lets us open files from the runtime error overlay.
      app.use(errorOverlayMiddleware());
    },
  },
};

const serverConfig = {
  entry: [
    `webpack/hot/poll?300`,
    paths.appServerIndexJs,
  ],
  output: {
    path: paths.appBuild,
    // publicPath: clientPublicPath,
    filename: `server.js`,
    libraryTarget: `commonjs2`,
  },
  module: {
    strictExportPresence: true,
    rules: [
      // Transform ES6 with Babel
      {
        test: /\.(js|jsx|mjs)$/,
        include: [paths.appSrc],
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve(`babel-loader`),
            options: {
              babelrc: false,
              presets: [
                `@babel/preset-react`,
                [ `@babel/preset-env`, {
                  modules: `commonjs`,
                  targets: {
                    node: `current`,
                  },
                }],
              ],
              plugins: [
                [ `styled-components`, {
                  ssr: true,
                  displayName: true,
                  fileName: IS_PROD,
                }],
                `@babel/plugin-syntax-dynamic-import`,
                `react-loadable/babel`,
                [ `@babel/plugin-transform-runtime`, {
                  helpers: true,
                  // we handle this with babel-polyfill
                  corejs: false,
                  useESModules: false,
                  // we handle this with babel-polyfill
                  regenerator: false,
                }],
              ],
            },
          },
        ],
      },
      {
        exclude: [
          /\.html$/,
          /\.(js|jsx|mjs)$/,
          /\.(s?css|sass)$/,
          /\.json$/,
          /\.bmp$/,
          /\.gif$/,
          /\.jpe?g$/,
          /\.png$/,
        ],
        loader: require.resolve(`file-loader`),
        options: {
          name: `static/media/[name].[hash:8].[ext]`,
          emitFile: true,
        },
      },
      // "url" loader works like "file" loader except that it embeds assets
      // smaller than specified limit in bytes as data URLs to avoid requests.
      // A missing `test` is equivalent to a match.
      {
        test: [ /\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/ ],
        loader: require.resolve(`url-loader`),
        options: {
          limit: 10000,
          name: `static/media/[name].[hash:8].[ext]`,
          emitFile: true,
        },
      },

      // "postcss" loader applies autoprefixer to our CSS.
      // "css" loader resolves paths in CSS and adds assets as dependencies.
      // "style" loader turns CSS into JS modules that inject <style> tags.
      // In production, we use a plugin to extract that CSS to a file, but
      // in development "style" loader enables hot editing of CSS.
      //
      // Note: this yields the exact same CSS config as create-react-app.
      {
        test: /(@siesta|src)\/css\/\.css$/,
        exclude: [paths.appBuild],
        use: [
          {
            loader: require.resolve(`css-loader`),
            options: {
              importLoaders: 1,
            },
          },
        ]
      },

      // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
      // using the extension .module.css
      {
        test: /\.css$/,
        exclude: [ paths.appBuild, /css\/\.css$/ ],
        use: [
          {
            // on the server we do not need to embed the css and just want the identifier mappings
            // https://github.com/webpack-contrib/css-loader#scope
            loader: require.resolve(`css-loader/locals`),
            options: {
              modules: true,
              importLoaders: 1,
              localIdentName: `[path]__[name]___[local]`,
            },
          },
        ],
      },
    ],
  },
  node: {
    __console: false,
    __dirname: false,
    __filename: false,
  },
  externals: [
    nodeExternals({
      whitelist: [
        IS_DEV ? `webpack/hot/poll?300` : null,
        /\.(eot|woff|woff2|ttf|otf)$/,
        /\.(svg|png|jpg|jpeg|gif|ico)$/,
        /\.(mp4|mp3|ogg|swf|webp)$/,
        /\.(css|scss|sass|sss|less)$/,
      ].filter((x) => x),
    }),
  ],
  watch: true,
  // Set webpack mode:
  mode: NODE_ENV,
  // Set webpack context to the current command's directory
  context: cwd(),
  // Specify target (either 'node' or 'web')
  target: `node`,
  // Controversially, decide on sourcemaps.
  devtool: false,
  // We need to tell webpack how to resolve both Razzle's node_modules and
  // the users', so we use resolve and resolveLoader.
  resolve: {
    modules: [
      ...modules,
      findUp(path.join(`node_modules`, `@siesta`, `css`), {type: `directory`}),
    ],
    extensions: [ `.jsx`, `.js`, `.json`, `.css` ],
    alias: {
      // This is required so symlinks work during development.
      'webpack/hot/poll': require.resolve(`webpack/hot/poll`),
    },
  },
  resolveLoader: {
    modules,
  },
  plugins: [
    new webpack.EnvironmentPlugin([`NODE_ENV`]),
    new webpack.HotModuleReplacementPlugin(),
    new StartServerPlugin({
      name: `server.js`,
      nodeArgs: [ `-r`, `source-map-support/register` ],
    }),
    // Ignore assets.json to avoid infinite recompile bug
    new webpack.WatchIgnorePlugin([paths.appManifest, paths.appLoadable]),
    // AWESOME: don't chunk for the server build!!!
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new WebpackBar({
      color: `#c065f4`,
      name: `server`,
    }),
  ]
};


export default [ clientConfig, serverConfig ];
