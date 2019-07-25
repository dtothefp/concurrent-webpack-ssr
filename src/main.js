import React from 'react';
import { hydrate } from 'react-dom';
import Loadable from 'react-loadable';
import App from './App/App';

Loadable.preloadReady().then(() => {
  hydrate(<App />, document.getElementById(`app`));
});
