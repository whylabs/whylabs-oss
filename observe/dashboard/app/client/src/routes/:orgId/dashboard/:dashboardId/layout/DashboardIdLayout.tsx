import { JSX } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';

import { useDashboardIdLayoutViewModel } from './useDashboardIdLayoutViewModel';

export const DashboardIdIndexLayout = (): JSX.Element => {
  const viewModel = useDashboardIdLayoutViewModel();

  return <Outlet context={viewModel} />;
};

export function useDashboardIdLayoutContext() {
  return useOutletContext<ReturnType<typeof useDashboardIdLayoutViewModel>>();
}
