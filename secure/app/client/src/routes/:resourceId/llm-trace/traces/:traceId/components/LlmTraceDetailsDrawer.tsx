import { createStyles } from '@mantine/core';
import { ReactNode } from 'react';
import { Colors } from '~/assets/Colors';
import { WhyLabsDrawer } from '~/components/design-system';
import { LOGO_WIDTH, SINGLE_HEADER_TOP_CONTAINER_HEIGHT } from '~/constants/styleConstants';

import { useLlmTraceIdViewModel } from '../useLlmTraceIdViewModel';

const DRAWER_HEADER_HEIGHT = SINGLE_HEADER_TOP_CONTAINER_HEIGHT;

const useStyles = createStyles(() => ({
  drawerBody: {
    backgroundColor: Colors.secondaryLight100,
    height: `calc(100% - ${DRAWER_HEADER_HEIGHT}px)`,
    padding: 0,
  },
  drawerContent: {
    maxWidth: 1260,
  },
}));

type LlmTraceDetailsDrawerProps = {
  children: ReactNode;
};

export const LlmTraceDetailsDrawer = ({ children }: LlmTraceDetailsDrawerProps) => {
  const { classes } = useStyles();
  const viewModel = useLlmTraceIdViewModel();

  return (
    <WhyLabsDrawer
      classNames={{
        body: classes.drawerBody,
        content: classes.drawerContent,
      }}
      closeButtonLabel="Close Trace Details"
      darkHeader
      isOpen
      lockScroll={false}
      onClose={viewModel.unselectTrace}
      size={`calc(100% - ${LOGO_WIDTH}px)`}
      title="Trace Details"
      withOverlay={false}
    >
      {children}
    </WhyLabsDrawer>
  );
};
