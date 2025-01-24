import { useMediaQuery } from '@mantine/hooks';

import { UnsupportedDevicePage } from 'pages/errors';

export type MediaRouteProps = {
  children: JSX.Element;
  mobileFriendly?: boolean;
};

export const MediaRoute = ({ children, mobileFriendly = false }: MediaRouteProps): JSX.Element | null => {
  const isMobileUser = useMediaQuery('(max-width:1000px)');

  if (isMobileUser && !mobileFriendly) {
    return <UnsupportedDevicePage />;
  }

  return children;
};
