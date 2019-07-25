import path from 'path';
import React from 'react';
import express from 'express';
import Loadable from 'react-loadable';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import { renderToString } from 'react-dom/server';
import { getBundles } from 'react-loadable/webpack';
import App from '../App/App';

const server = express();

server
  .disable(`x-powered-by`)
  .use(express.static(`dist`))
  .get(`/*`, async (req, res) => {
    const assets = require(`../../dist/assets.json`);
    const loadableStats = require(`../../dist/react-loadable.json`);
    const context = {};
    const sheet = new ServerStyleSheet();
    const modules = [];

    await Loadable.preloadAll();

    const markup = renderToString(
      <Loadable.Capture report={(moduleName) => modules.push(moduleName)}>
        <StyleSheetManager sheet={sheet.instance}>
          <App />
        </StyleSheetManager>
      </Loadable.Capture>
    );

    const css = sheet.getStyleTags();
    const bundles = getBundles(loadableStats, modules);
    const chunks = bundles
      .filter(({file}) => !file.endsWith(`.map`))
      .map(({file}) => {
        const chunkName = path.basename(file).replace(/\..*$/, ``);

        return assets[chunkName].js;
      });
    const jsFiles = [
      assets.client.js,
      ...chunks,
    ];

    const js = jsFiles
      .filter((path) => path.endsWith(`.js`))
      .map((path) => `<script onload="window.LOAD()" src="${path}"></script>`);

    const loader = `
      <script>
        let scripts = ${js.length};
        window.LOAD = function() {
          scripts --;

          if (scripts === 0) {
            window.MAIN();
          }
        }
      </script>`;

    js.unshift(loader);

    const html = `
    <!doctype html>
    <html lang="">
      <head>
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta charset="utf-8" />
          <title>Welcome to Razzle</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <div id="app">${markup}</div>
        ${js.join(`\n`)}
      </body>
    </html>
    `;

    if (context.url) {
      res.redirect(context.url);
    } else {
      res.status(200).send(html);
    }
  });

export default server;
