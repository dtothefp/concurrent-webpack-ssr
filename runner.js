import webpack from 'webpack';
import DevServer from 'webpack-dev-server';
import webpackConfig from './webpack.config.babel';

const {NODE_ENV} = process.env;
const [config] = webpackConfig;
let compiler;

if (NODE_ENV === `development`) {
  const {devServer: serverOptions} = config;

  config.plugins.unshift(
    new webpack.HotModuleReplacementPlugin()
  );

  DevServer.addDevServerEntrypoints(config, serverOptions);
  compiler = webpack(config);

  const app = new DevServer(compiler, serverOptions);

  const hasRun = false;

  app.middleware.waitUntilValid(() => {
    app.listen(serverOptions.port, serverOptions.host, (err) => {
      if (err) throw err;

      console.log(`==> 🔥  Webpack development server listening on port`, serverOptions.port);
    });
  });
} else {
  compiler = webpack(config);
  compiler.run((err, stats) => {
    if (err) throw err;

    console.log(stats.toString());
  });
}
