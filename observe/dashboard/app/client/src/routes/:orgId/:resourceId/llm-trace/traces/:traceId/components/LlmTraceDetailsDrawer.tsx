import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsDrawer } from '~/components/design-system';
import { SINGLE_HEADER_TOP_CONTAINER_HEIGHT } from '~/constants/styleConstants';
import { ReactNode } from 'react';

const DRAWER_HEADER_HEIGHT = SINGLE_HEADER_TOP_CONTAINER_HEIGHT;

const useStyles = createStyles(() => ({
  drawerBody: {
    backgroundColor: Colors.secondaryLight100,
    height: `calc(100% - ${DRAWER_HEADER_HEIGHT}px)`,
    padding: 0,
  },
}));

type LlmTraceDetailsDrawerProps = {
  children: ReactNode;
  onClose: () => void;
};

export const LlmTraceDetailsDrawer = ({ children, onClose }: LlmTraceDetailsDrawerProps) => {
  const { classes } = useStyles();

  return (
    <WhyLabsDrawer
      classNames={{
        body: classes.drawerBody,
      }}
      closeButtonLabel="Close Trace Details"
      darkHeader
      isOpen
      lockScroll={false}
      onClose={onClose}
      size="min(calc(100% - 200px), 1440px)"
      title="Trace Details"
      withOverlay={false}
      uniqueId="trace-details-drawer"
    >
      {children}
    </WhyLabsDrawer>
  );
};
