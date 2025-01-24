import { RouteObject } from 'react-router-dom';

import { AppRoutePathIds, AppRoutePaths } from './AppRoutePaths';
import { Modify } from './misc';

type RouteHandle = {
  ignorePageLayout?: boolean;
  title?: (data?: unknown) => string;
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
