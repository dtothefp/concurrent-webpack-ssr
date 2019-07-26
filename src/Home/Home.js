import React from 'react';
import cx from 'classnames';
import styles from './Home.css';
import Child from './Child';

console.log(`((((((((((CHILD))))))))))`, styles);

export default () => (
  <>
    <h1 className={cx(styles.bg)}>Home</h1>
    <Child />
  </>
);
