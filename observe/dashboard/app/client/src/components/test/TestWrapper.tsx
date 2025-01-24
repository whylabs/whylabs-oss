import { MantineProvider } from '@mantine/core';
import { WithTRPC } from '~/decorator/WithTRPC';
import { ComponentProps } from 'react';
import { RouterProvider } from 'react-router-dom';

type TestWrapperProps = {
  router: ComponentProps<typeof RouterProvider>['router'];
};

export const TestWrapper = ({ router }: TestWrapperProps) => {
  return (
    <WithTRPC>
      <MantineProvider>
        <RouterProvider router={router} />
      </MantineProvider>
    </WithTRPC>
  );
};
