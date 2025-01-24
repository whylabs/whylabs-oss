import { useMediaQuery } from '@mantine/hooks';
import { FeedbackFormModal } from '~/components/feedback-form/FeedbackFormModal';
import { UnsupportedDevicePage } from '~/components/layout/pages/UnsupportedDevicePage';
import { WhyLabsSidebar } from '~/components/sidebar/WhyLabsSidebar';
import { initHeapSession, initLogRocketSession, initPendoSession } from '~/telemetry';
import { LoaderData } from '~/types/LoaderData';
import { IS_DEV_ENV } from '~/utils/constants';
import { JSX, useEffect } from 'react';
import { Outlet, useLoaderData } from 'react-router-dom';

import { rootLoader } from './rootLoader';

const Root = (): JSX.Element => {
  const { user } = useLoaderData() as LoaderData<typeof rootLoader>;

  const isMobileUser = useMediaQuery('(max-width:1000px)') && !IS_DEV_ENV;

  useEffect(() => {
    initLogRocketSession(user);
    initHeapSession(user);
    initPendoSession(user);
  }, [user]);

  if (isMobileUser) return <UnsupportedDevicePage />;

  return (
    <>
      <WhyLabsSidebar />
      <Outlet />
      <FeedbackFormModal />
    </>
  );
};

export default Root;
