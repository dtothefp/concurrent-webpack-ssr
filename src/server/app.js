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
    Object.keys(require.cache).forEach((fp) => {
      if (/(assets|react-loadable)\.json/.test(fp)) {
        delete require.cache[fp];
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

    const {client} = assets;

    const bundles = getBundles(loadableStats, modules);
    const chunks = bundles
      .filter(({file}) => !file.endsWith(`.map`))
      .reduce((acc, {file}) => {
        const ext = path.extname(file);
        const [ basename ] = path.basename(file, ext).split(`.`);
        const extKey = ext.replace(/^\./, ``);

        acc[extKey].push(assets[basename][extKey]);

        return acc;
      }, {
        css: [client.css],
        js: [client.js],
      });

    const css = [
      ...chunks.css.map((fp) => `<link href="${fp}" rel="stylesheet" />`),
      sheet.getStyleTags()
    ];

    const js = [
      `<script>
        let scripts = ${chunks.js.length};
        window.LOAD = function() {
          scripts --;
          if (scripts === 0) {
            window.MAIN();
          }
        }
      </script>`,
      ...chunks.js.map((fp) => `<script onload="window.LOAD()" src="${fp}"></script>`),
    ];

    const html = `
    <!doctype html>
    <html lang="">
      <head>
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta charset="utf-8" />
          <title>Welcome to Razzle</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${css.join(`\n`)}
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
