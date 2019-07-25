/* eslint camelcase:0 */
'use strict';

const fs = require(`fs-extra`);
const path = require(`path`);
const webpack = require(`webpack`);
const TerserPlugin = require(`terser-webpack-plugin`);
const nodeExternals = require(`webpack-node-externals`);
const AssetsPlugin = require(`assets-webpack-plugin`);
const StartServerPlugin = require(`start-server-webpack-plugin`);
const errorOverlayMiddleware = require(`react-dev-utils/errorOverlayMiddleware`);
const WebpackBar = require(`webpackbar`);
const {sync: findUp} = require(`find-up`);
const { ReactLoadablePlugin } = require(`react-loadable/webpack`);

// This is the Webpack configuration factory. It's the juice!
module.exports = (
  target = `web`
) => {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV === `development`;
  }

  // Capture any --inspect or --inspect-brk flags (with optional values) so that we
  // can pass them when we invoke nodejs
  const INSPECT_BRK = process.argv.find((arg) => arg.match(/--inspect-brk(=|$)/));
  const INSPECT = process.argv.find((arg) => arg.match(/--inspect(=|$)/));

  const appDirectory = fs.realpathSync(process.cwd());
  const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);
  const nodePaths = (process.env.NODE_PATH || ``)
    .split(process.platform === `win32` ? `;` : `:`)
    .filter(Boolean)
    .filter((folder) => !path.isAbsolute(folder))
    .map(resolveApp);
  const appNodeModules = findUp(`node_modules`, {type: `directory`});

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

  const {NODE_ENV} = process.env;
  // Define some useful shorthands.
  const IS_NODE = target === `node`;
  const IS_WEB = target === `web`;
  const IS_PROD = NODE_ENV === `production`;
  const IS_DEV = NODE_ENV === `development`;
  const cwd = path.join.bind(path, process.cwd());

  const devServerHost = `0.0.0.0`;
  const devServerPort = `8080`;
  // VMs, Docker containers might not be available at localhost:3001. CLIENT_PUBLIC_PATH can override.
  const clientPublicPath = IS_DEV ? `http://${devServerHost}:${devServerPort}/` : `/`;
  const modules = [`node_modules`].concat(
    path.dirname(appNodeModules) !== cwd() ? appNodeModules : [],
  );

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

  if (IS_NODE) {
    // hard code version for Lambda
    targets.node = `10.15`;
  } else if (IS_WEB) {
    targets.browsers = evergreenBrowsers;
  }

  // This is our base webpack config.
  const config = {
    // Set webpack mode:
    mode: NODE_ENV,
    // Set webpack context to the current command's directory
    context: cwd(),
    // Specify target (either 'node' or 'web')
    target,
    // Controversially, decide on sourcemaps.
    devtool: IS_DEV ? `cheap-module-source-map` : `source-map`,
    // We need to tell webpack how to resolve both Razzle's node_modules and
    // the users', so we use resolve and resolveLoader.
    resolve: {
      modules,
      extensions: [ `.jsx`, `.js`, `.json` ],
      alias: {
        // This is required so symlinks work during development.
        'webpack/hot/poll': require.resolve(`webpack/hot/poll`),
        'react-dom': `@hot-loader/react-dom`,
      },
    },
    resolveLoader: {
      modules,
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
                    modules: IS_WEB ? false : `commonjs`,
                    targets,
                  }],
                ],
                plugins: [
                  [ `styled-components`, {
                    ssr: true,
                    displayName: true,
                    fileName: false,
                  }],
                  `@babel/plugin-syntax-dynamic-import`,
                  `react-hot-loader/babel`,
                  `react-loadable/babel`,
                  [ `@babel/plugin-transform-runtime`, {
                    helpers: true,
                    // we handle this with babel-polyfill
                    corejs: false,
                    useESModules: !IS_NODE,
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

      ],
    },
    plugins: [
      new webpack.EnvironmentPlugin([`NODE_ENV`]),
    ],
  };

  if (IS_NODE) {
    // We want to uphold node's __filename, and __dirname.
    config.node = {
      __console: false,
      __dirname: false,
      __filename: false,
    };

    // We need to tell webpack what to bundle into our Node bundle.
    config.externals = [
      nodeExternals({
        whitelist: [
          IS_DEV ? `webpack/hot/poll?300` : null,
          /\.(eot|woff|woff2|ttf|otf)$/,
          /\.(svg|png|jpg|jpeg|gif|ico)$/,
          /\.(mp4|mp3|ogg|swf|webp)$/,
          /\.(css|scss|sass|sss|less)$/,
        ].filter((x) => x),
      }),
    ];

    // Specify webpack Node.js output path and filename
    config.output = {
      path: paths.appBuild,
      publicPath: clientPublicPath,
      filename: `server.js`,
      libraryTarget: `commonjs2`,
    };
    // Add some plugins...
    config.plugins = [
      ...config.plugins,
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ];

    config.entry = [paths.appServerIndexJs];

    if (IS_DEV) {
      // Use watch mode
      config.watch = true;
      config.entry.unshift(`webpack/hot/poll?300`);

      // Pretty format server errors
      config.entry.unshift(`razzle-dev-utils/prettyNodeErrors`);

      const nodeArgs = [ `-r`, `source-map-support/register` ];

      if (INSPECT_BRK) {
        nodeArgs.push(INSPECT_BRK);
      } else if (INSPECT) {
        nodeArgs.push(INSPECT);
      }

      config.plugins = [
        ...config.plugins,
        // Add hot module replacement
        new webpack.HotModuleReplacementPlugin(),
        // Supress errors to console (we use our own logger)
        new StartServerPlugin({
          name: `server.js`,
          nodeArgs,
        }),
        // Ignore assets.json to avoid infinite recompile bug
        new webpack.WatchIgnorePlugin([paths.appManifest]),
      ];
    }
  }

  const splitChunks = {
    chunks: `all`,
    cacheGroups: {
      default: false,
      vendors: false,
    },
  };

  if (IS_WEB) {
    config.plugins = [
      // Output our JS and CSS files in a manifest file called assets.json
      // in the build directory.
      new AssetsPlugin({
        path: paths.appBuild,
        filename: `assets.json`,
      }),
      // Maybe we should move to this???
      // new ManifestPlugin({
      //   path: paths.appBuild,
      //   writeToFileEmit: true,
      //   filename: 'manifest.json',
      // }),
    ];

    if (IS_DEV) {
      // Setup Webpack Dev Server on port 3001 and
      // specify our client entry point /client/index.js
      config.entry = {
        client: [
          `react-hot-loader/patch`,
          paths.appClientIndexJs,
        ],
      };

      // Configure our client bundles output. Not the public path is to 3001.
      config.output = {
        path: paths.appBuildPublic,
        publicPath: clientPublicPath,
        pathinfo: true,
        libraryTarget: `var`,
        filename: `static/js/bundle.js`,
        chunkFilename: `static/js/[name].chunk.js`,
      };
      // Configure webpack-dev-server to serve our client-side bundle from
      // http://${dotenv.raw.HOST}:3001
      config.devServer = {
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
        host: devServerHost,
        hot: true,
        noInfo: true,
        overlay: false,
        port: devServerPort,
        quiet: true,
        // By default files from `contentBase` will not trigger a page reload.
        // Reportedly, this avoids CPU overload on some systems.
        // https://github.com/facebookincubator/create-react-app/issues/293
        watchOptions: {
          ignored: /node_modules/,
        },
        before(app) {
          // This lets us open files from the runtime error overlay.
          app.use(errorOverlayMiddleware());
        },
      };
      // Add client-only development plugins
      config.plugins = [
        ...config.plugins,
        new webpack.HotModuleReplacementPlugin({
          multiStep: true,
        }),
      ];

      config.optimization = {
        splitChunks,
        // @todo automatic vendor bundle
        // Automatically split vendor and commons
        // https://twitter.com/wSokra/status/969633336732905474
        // splitChunks: {
        //   chunks: 'all',
        // },
        // Keep the runtime chunk seperated to enable long term caching
        // https://twitter.com/wSokra/status/969679223278505985
        // runtimeChunk: true,
      };
    } else {
      // Specify production entry point (/client/index.js)
      config.entry = {
        client: paths.appClientIndexJs,
      };

      // Specify the client output directory and paths. Notice that we have
      // changed the publiPath to just '/' from http://localhost:3001. This is because
      // we will only be using one port in production.
      config.output = {
        path: paths.appBuildPublic,
        publicPath: clientPublicPath,
        filename: `static/js/bundle.[chunkhash:8].js`,
        chunkFilename: `static/js/[name].[chunkhash:8].chunk.js`,
        libraryTarget: `var`,
      };

      config.plugins = [
        ...config.plugins,
        new webpack.HashedModuleIdsPlugin(),
        new webpack.optimize.AggressiveMergingPlugin(),
      ];

      config.optimization = {
        splitChunks,
        minimize: false,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              parse: {
                // we want uglify-js to parse ecma 8 code. However, we don't want it
                // to apply any minfication steps that turns valid ecma 5 code
                // into invalid ecma 5 code. This is why the 'compress' and 'output'
                // sections only apply transformations that are ecma 5 safe
                // https://github.com/facebook/create-react-app/pull/4234
                ecma: 8,
              },
              compress: {
                ecma: 5,
                warnings: false,
                // Disabled because of an issue with Uglify breaking seemingly valid code:
                // https://github.com/facebook/create-react-app/issues/2376
                // Pending further investigation:
                // https://github.com/mishoo/UglifyJS2/issues/2011
                comparisons: false,
                // Disabled because of an issue with Terser breaking valid code:
                // https://github.com/facebook/create-react-app/issues/5250
                // Pending futher investigation:
                // https://github.com/terser-js/terser/issues/120
                inline: 2,
              },
              mangle: {
                safari10: true,
              },
              output: {
                ecma: 5,
                comments: false,
                // Turned on because emoji and regex is not minified properly using default
                // https://github.com/facebook/create-react-app/issues/2488
                ascii_only: true,
              },
            },
            // Use multi-process parallel running to improve the build speed
            // Default number of concurrent runs: os.cpus().length - 1
            parallel: true,
            // Enable file caching
            cache: true,
            // @todo add flag for sourcemaps
            sourceMap: true,
          }),
        ],
      };
    }

    config.plugins = [
      new ReactLoadablePlugin({
        filename: `./dist/react-loadable.json`,
      }),
      ...config.plugins,
    ];
  }

  if (IS_DEV) {
    config.plugins = [
      ...config.plugins,
      new WebpackBar({
        color: target === `web` ? `#f56be2` : `#c065f4`,
        name: target === `web` ? `client` : `server`,
      }),
    ];
  }

  return config;
};
