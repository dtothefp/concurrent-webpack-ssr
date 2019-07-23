import React from 'react';
import loadable from 'react-loadable';

const LoadableComponent = loadable({
  loader: () => import(/* webpackChunkName: "Home" */ `./Home`),
  loading: () => <div>Loading...</div>,
});

export default () => <LoadableComponent />;
