import React from 'react';
import Loadable from 'react-loadable';
import {renderToString} from 'react-dom/server';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import isObject from 'is-object';
import { getBundles } from 'react-loadable/webpack';

// This function makes server rendering of asset references consistent with different webpack chunk/entry configurations
function normalizeAssets(assets) {
  if (isObject(assets)) {
    return Object.values(assets);
  }

  return Array.isArray(assets) ? assets : [assets];
}

export default async ({clientStats, serverStats, entry}) => {
  const assetsByChunkName = clientStats.toJson().assetsByChunkName;
  const loadableStatsPath = require.resolve(`./dist/react-loadable.json`);

  delete require.cache[entry];
  delete require.cache[loadableStatsPath];

  const {default: ServerEntry} = require(entry);
  const loadableStats = require(loadableStatsPath);

  const sheet = new ServerStyleSheet();
  const modules = [];
  const Component = (
    <Loadable.Capture report={(moduleName) => modules.push(moduleName)}>
      <StyleSheetManager sheet={sheet.instance}>
        <ServerEntry />
      </StyleSheetManager>
    </Loadable.Capture>
  );

  await Loadable.preloadAll();

  const html = renderToString(Component);
  const css = sheet.getStyleTags();
  const bundles = getBundles(loadableStats, modules);
  const jsFiles = [
    ...normalizeAssets(clientStats.toJson().assetsByChunkName.client),
    ...bundles.map(({file}) => file),
  ];

  console.log(`************`, jsFiles);

  const js = jsFiles
    .filter((path) => path.endsWith(`.js`))
    .map((path) => `<script src="${path}"></script>`)
    .join(`\n`);

  // then use `assetsByChunkName` for server-sider rendering
  // For example, if you have only one main chunk:
  return `
    <html>
      <head>
        <title>My App</title>
        ${css}
      </head>
      <body>
        <div id="app">${html}</div>
        ${js}
      </body>
    </html>
  `;
};
