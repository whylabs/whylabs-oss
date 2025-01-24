import { JSX } from 'react';
import { Outlet, useLoaderData } from 'react-router-dom';
import DogDialogQuestionMark from '~/components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import WhyDogIdle from '~/components/animated-components/whydog/WhyDogIdle';
import { AttentionPageWrap } from '~/components/layout/AttentionPageWrap';
import { LoaderData } from '~/types/LoaderData';

import { loader } from './ResourceIdLayoutLoader';

export const ResourceIdLayout = (): JSX.Element => {
  const resource = useLoaderData() as LoaderData<typeof loader>;

  if (resource) return <Outlet />;

  return (
    <AttentionPageWrap
      title="Resource not found!"
      dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
      subtitle="It looks like the resource you are trying to access does not exist"
    >
      Navigate back to <a href={window.location.origin}>resource overview page!</a>
    </AttentionPageWrap>
  );
};
