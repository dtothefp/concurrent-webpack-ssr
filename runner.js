import path from 'path';
import webpack from 'webpack';
import DevServer from 'webpack-dev-server';
import createConfig from './webpack.config.babel';
import template from './template';

const {NODE_ENV = `development`} = process.env;
const clientConfig = createConfig(`web`);
const serverConfig = createConfig(`node`);

// Compile our assets with webpack
const clientCompiler = webpack(clientConfig);
const serverCompiler = webpack(serverConfig);
let serverStats;

if (NODE_ENV === `development`) {
  const {devServer: serverOptions} = clientConfig;
  const routeRe = /^\/.*\.html$/;

  // Create a new instance of Webpack-dev-server for our client assets.
  // This will actually run on a different port than the users app.
  const app = new DevServer(clientCompiler, serverOptions);

  let watching = false;

  // Otherwise, create a new watcher for our server code.
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

  // Start our server webpack instance in watch mode after assets compile
  serverCompiler.plugin(`done`, (stats) => {
    serverStats = stats;
    // If we've already started the server watcher, bail early.
    if (watching) return;

    watching = true;

    app.middleware.waitUntilValid(() => {
      app.listen(serverOptions.port, serverOptions.host, (err) => {
        if (err) throw err;

        console.log(`==> 🔥  Webpack development server listening on port`, serverOptions.port);
      });
    });
  });
} else {
  clientCompiler.run(() => {

  });
  serverCompiler.run(() => {

  });
}
