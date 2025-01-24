import { JSX } from 'react';
import { Outlet } from 'react-router-dom';

export const DashboardLayout = (): JSX.Element => {
  return <Outlet />;
};
