import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ActionsBottomBar } from '~/components/ActionsBottomBar';
import { ConfirmLosingChangesDialog, WhyLabsEditableText } from '~/components/design-system';
import { ReactElement } from 'react';

export const BUILDER_BOTTOM_CONTROLS_HEIGHT = 68;

const useStyles = createStyles(() => ({
  root: {
    background: Colors.white,
    display: 'flex',
    flexDirection: 'column',
    // this flex is only <content> and <footer>, so we use space-between to keep footer on the bottom
    justifyContent: 'space-between',
    overflow: 'auto',
    width: '100%',
    flex: 1,
  },
  pageContent: {
    padding: '14px 20px 0px 20px',
    minHeight: 720,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  chartNameWrapper: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    width: '100%',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
    background: '#D9D9D9',
  },
  bottomToolbar: {
    height: BUILDER_BOTTOM_CONTROLS_HEIGHT,
  },
}));

type WidgetBuilderLayoutProps = {
  children: ReactElement;
  onChangeDisplayName: (v: string) => void;
  displayName: string;
  onSaveWidget: () => void;
  onCancel: () => void;
  losingChangesDialog: {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  };
  disableSave: boolean;
};
export const WidgetBuilderLayout = ({
  children,
  onChangeDisplayName,
  displayName,
  losingChangesDialog,
  disableSave,
  onSaveWidget,
  onCancel,
}: WidgetBuilderLayoutProps) => {
  const { classes } = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.pageContent}>
        <div className={classes.chartNameWrapper}>
          <WhyLabsEditableText
            label="widget name"
            defaultEmptyValue="Unnamed widget"
            onChange={onChangeDisplayName}
            value={displayName}
          />
          <div className={classes.horizontalLine} />
        </div>
        {children}
      </div>
      <ActionsBottomBar
        cancelButtonProps={{
          onClick: onCancel,
        }}
        className={classes.bottomToolbar}
        submitButtonProps={{
          onClick: onSaveWidget,
          disabled: disableSave,
        }}
      />
      <ConfirmLosingChangesDialog {...losingChangesDialog} />
    </div>
  );
};
