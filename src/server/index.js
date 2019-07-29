import http from 'http';

// disable "app" is read-only"
let {default: app} = require(`./app`);

const server = http.createServer(app);

let currentApp = app;

server.listen(process.env.PORT || 3000, (error) => {
  if (error) {
    console.log(error);
  }

  console.log(`🚀 started`);
});

if (module.hot) {
  console.log(`✅  Server-side HMR Enabled!`);

  module.hot.accept(`./app`, () => {
    console.log(`🔁  HMR Reloading \`./app\`...`);

    try {
      ({default: app} = require(`./app`));
      server.removeListener(`request`, currentApp);
      server.on(`request`, app);
      currentApp = app;
    } catch (error) {
      console.error(error);
    }
  });
}
