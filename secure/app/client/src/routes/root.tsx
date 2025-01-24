import { JSX } from 'react';
import { Outlet } from 'react-router-dom';

const Root = (): JSX.Element => {
  return <Outlet />;
};

export default Root;
