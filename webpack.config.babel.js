import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import HtmlWebPackPlugin from 'html-webpack-plugin';

const {sync: findUp} = require(`find-up`);
const ExtractCssChunks = require(`extract-css-chunks-webpack-plugin`);

const dest = `dist`;
const base = path.join.bind(path, process.cwd());
const {NODE_ENV} = process.env;
const IS_DEV = NODE_ENV === `development`;
const IS_PROD = NODE_ENV === `production`;

const plugins = [
  new webpack.EnvironmentPlugin([`NODE_ENV`]),
  new webpack.NamedModulesPlugin(),
];

const config = {
  optimization: {
    minimize: false,
  },
  mode: NODE_ENV,
};

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

console.log('**********', postcssOptionsConfig)

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
  appPublic: resolveApp(`public`),
  appNodeModules: resolveApp(`node_modules`),
  appSrc: resolveApp(`src`),
  appPackageJson: resolveApp(`package.json`),
  appServerIndexJs: resolveApp(`src/server/index.js`),
  appClientIndexJs: resolveApp(`src/main.js`),
  nodePaths,
};

const clientConfig = {
  ...config,
  entry: {
    main: [ `react-hot-loader/patch`, `./src/main.js` ],
  },
  output: {
    filename: `[name]-client.js`,
    path: base(dest),
  },
  devServer: {
    contentBase: base(dest),
    host: `localhost`,
    port: 8080,
    hot: true,
  },
  module: {
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
    ],
  },
  resolve: {
    alias: {
      'react-dom': `@hot-loader/react-dom`,
    },
  },
  plugins: [
    ...plugins,
    new HtmlWebPackPlugin({
      template: base(`src`, `index.html`),
    }),
    new ExtractCssChunks(
      {
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: "[name].css",
        chunkFilename: "[id].css",
        orderWarning: true, // Disable to remove warnings about conflicting order between imports
      }
    ),
  ],
};

const serverConfig = {
  ...config,
  entry: {
    main: `./src/App/App.js`,
  },
  output: {
    filename: `[name]-server.js`,
    path: base(dest),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: `babel-loader`,
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
              fileName: false,
            }],
            `@babel/plugin-syntax-dynamic-import`,
          ],
        },
      },
    ],
  },
  plugins: [
    ...plugins,
  ],
};

export default [ clientConfig, serverConfig ];
