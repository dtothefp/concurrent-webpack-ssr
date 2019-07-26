import React from 'react';
import { hydrate } from 'react-dom';
import Loadable from 'react-loadable';
import App from './App/App';

// import '@siesta/css/base.css';

// IMPORTANT:
// 1) load the chunk JS file before the main.js file or load them both and
// wrap this Loadable initializer in a function that is executed when everything loads.
// Otherwise, preload will not work and you get a warning from React DOM
// Warning: Expected server HTML to contain a matching <div> in <div>
//
// or
//
// 2) export this file as a function that Webpack uses the `output` propert to create window.MAIN.
// when the `async` script tags are loaded `window.MAIN` is invoked
export default () => {
  Loadable.preloadReady().then(() => {
    hydrate(<App />, document.getElementById(`app`));
  });
};
