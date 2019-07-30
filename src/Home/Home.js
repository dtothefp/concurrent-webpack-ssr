import React from 'react';
import styles from './Home.css';
import Child from './Child';

export default () => (
  <>
    <h1 className={styles.heading}>Home</h1>
    <Child />
  </>
);
