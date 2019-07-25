import path from 'path';
import webpack from 'webpack';
import devServer from 'webpack-dev-server';
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
  const app = new devServer(clientCompiler, {
    ...serverOptions,
    after(app) {
      if (typeof serverOptions.after === `function`) {
        serverOptions.after(app);
      }

      app.use(async (req, res, next) => {
        if (!routeRe.test(req.url)) return next();

        const html = await template({
          entry: require.resolve(path.join(serverConfig.output.path, serverConfig.output.filename)),
          clientStats: res.locals.webpackStats,
          serverStats,
        });

        res.status(200).send(html);
      });
    },
  });

  let watching = false;

  // Otherwise, create a new watcher for our server code.
  serverCompiler.watch(
    {
      quiet: true,
      stats: `none`,
    },
    /* eslint-disable no-unused-vars */
    (err, stats) => {}
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
