import { hot } from 'react-hot-loader/root';
import { setConfig } from 'react-hot-loader';
import React from 'react';
import Heading from './app.css';
import Home from '../Home';

setConfig({ logLevel: 'debug' });

const App = () => (
  <div>
    <Heading>Stuff App</Heading>
    <Home />
  </div>
);

export default hot(App);

