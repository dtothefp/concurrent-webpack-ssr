import webpack from 'webpack';
import DevServer from 'webpack-dev-server';
import webpackConfig from './webpack.config.babel';

const {NODE_ENV} = process.env;
const [clientConfig, serverConfig] = webpackConfig;
const serverCompiler = webpack(serverConfig);
const compiler = webpack(clientConfig);

if (NODE_ENV === `development`) {
  const {devServer: serverOptions} = clientConfig;

  serverCompiler.watch(
    {
      quiet: true,
      stats: `none`,
    },
    /* eslint-disable no-unused-vars */
    (err, stats) => {
      if (err) return console.error(err);

      console.log(stats.toString());
    }
  );

  DevServer.addDevServerEntrypoints(clientConfig, serverOptions);

  const app = new DevServer(compiler, serverOptions);

  const hasRun = false;

  app.middleware.waitUntilValid(() => {
    app.listen(serverOptions.port, serverOptions.host, (err) => {
      if (err) throw err;

      console.log(`==> 🔥  Webpack development server listening on port`, serverOptions.port);
    });
  });
} else {
  compiler.run((err, stats) => {
    if (err) throw err;

    console.log(stats.toString());
  });

  serverCompiler.run((err, stats) => {
      if (err) return console.error(err);

      console.log(stats.toString());
    }
  );
}
