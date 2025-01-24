import { RouteObject, UIMatch } from 'react-router-dom';

import { AppRoutePathIds, AppRoutePaths } from './AppRoutePaths';
import { Modify } from './misc';

export type RouteHandle = {
  ignorePageLayout?: boolean;
  title?: (data?: unknown) => string;
};

export type WhyLabsRouteMatch<TData = unknown> = Omit<UIMatch<TData, RouteHandle>, 'id'> & {
  id: AppRoutePathIds;
};

type CommonRoute = {
  handle?: RouteHandle;
  id: AppRoutePathIds;
};

type WhyLabsIndexRoute = CommonRoute & {
  children?: undefined;
  index: true;
  path?: undefined;
};

type WhyLabsNonIndexRoute = CommonRoute & {
  children?: WhyLabsRouteObject[];
  index?: false;
  path: (typeof AppRoutePaths)[keyof typeof AppRoutePaths];
};

export type WhyLabsRouteObject = Modify<RouteObject, WhyLabsIndexRoute | WhyLabsNonIndexRoute>;
