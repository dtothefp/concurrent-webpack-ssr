import path from 'path';
import webpack from 'webpack';
import HtmlWebPackPlugin from 'html-webpack-plugin';

const dest = `dist`;
const base = path.join.bind(path, process.cwd());
const {NODE_ENV} = process.env;

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
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: `babel-loader`,
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
              // ssr: true,
              displayName: true,
              fileName: false,
            }],
            `@babel/plugin-syntax-dynamic-import`,
            `react-hot-loader/babel`,
          ],
        },
      },
    ],
  },
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom'
    }
  },
  plugins: [
    ...plugins,
    new HtmlWebPackPlugin({
      template: base(`src`, `index.html`),
    }),
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

export default [clientConfig, serverConfig];
