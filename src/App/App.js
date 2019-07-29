import { hot } from 'react-hot-loader/root';
import { setConfig } from 'react-hot-loader';
import React from 'react';
import styles from './App.css';
import Home from '../Home';

setConfig({ logLevel: `debug` });

console.log(`STYLES`, styles);

const App = () => (
  <div>
    <h1 className={styles.heading}>Stuff App</h1>
    <Home />
  </div>
);

export default hot(App);

