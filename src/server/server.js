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
    Object.keys(require.cache).forEach((key) => {
      if (/(assets|react-loadable)\.json$/.test(key)) {
        delete require.cache[key];
      }
    });
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
      .reduce((acc, {file, name}) => {
        const assetKey = path.basename(name, `.js`);

        if (file.endsWith(`.css`)) {
          acc.css.push(assets[assetKey].css);
        }

        if (file.endsWith(`.js`)) {
          acc.js.push(assets[assetKey].js);
        }

        return acc;
      }, {
        css: [assets.client.css],
        js: [assets.client.js],
      });


    const cssTags = chunks.css.map((fp) => `<link rel="stylesheet" data-href="${path.basename(fp)}" href="${fp}" />`).join(`\n`);
    const jsTags = chunks.js.map((fp) => `<script onload="window.LOAD()" src="${fp}"></script>`).join(`\n`);

    const js = `
      <script>
        let scripts = ${jsTags.length};
        window.LOAD = function() {
          scripts --;

          if (scripts === 0) {
            window.MAIN();
          }
        }
      </script>`;

    const html = `
    <!doctype html>
    <html lang="">
      <head>
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta charset="utf-8" />
          <title>Welcome to Razzle</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${cssTags}
          ${css}
      </head>
      <body>
        <div id="app">${markup}</div>
        ${js}
        ${jsTags}
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
