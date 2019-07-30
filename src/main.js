import React from 'react';
import { render } from 'react-dom';

import './css/main.css';
import App from './App/App';

export default () => {
  render(<App />, document.getElementById(`app`));
};
