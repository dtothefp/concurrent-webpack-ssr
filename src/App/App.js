import { hot } from 'react-hot-loader/root';
import { setConfig } from 'react-hot-loader';
import React from 'react';
import Home from '../Home';
import styles from './App.css';

console.log('(((((())))))', styles)

setConfig({ logLevel: `debug` });

const App = () => (
  <div>
    <Home />
  </div>
);

export default hot(App);

