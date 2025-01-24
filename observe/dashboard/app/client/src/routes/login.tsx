import { WhyLabsLoadingOverlay } from '~/components/design-system';
import { DASHBIRD_URI } from '~/utils/constants';
import { JSX } from 'react';
import { LoaderFunction } from 'react-router-dom';

export const loader: LoaderFunction = ({ request }) => {
  const redirectUri = new URL(request.url).searchParams.get('redirectUri');
  let url = `${DASHBIRD_URI}/login`;
  if (redirectUri) url += `?redirectUri=${redirectUri}`;

  window.location.href = url;
  return null;
};

const LoginPage = (): JSX.Element => {
  // Shouldn't render at all, it's just a route to redirect to login URI
  return <WhyLabsLoadingOverlay visible />;
};

export default LoginPage;
