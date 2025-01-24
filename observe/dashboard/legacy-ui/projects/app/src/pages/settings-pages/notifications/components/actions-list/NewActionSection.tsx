import { createStyles } from '@mantine/core';
import { ReactElement } from 'react';
import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import { Colors } from '@whylabs/observatory-lib';
import { useQueryParams } from 'utils/queryUtils';
import { EDITING_KEY } from 'types/navTags';
import { useNewNotificationPageStyles } from '../../NewNotificationsPageContentAreaStyles';

const useStyles = createStyles({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: Colors.secondaryLight1000,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.25,
  },
  codeLine: {
    background: Colors.brandSecondary100,
    fontSize: '15px',
    padding: '2px 7px 3px 7px',
    fontFamily: 'Inconsolata',
    color: 'black',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: -0.15,
    margin: '0 2px',
  },
});

export const NewActionSection = (): ReactElement => {
  const { classes } = useStyles();
  const { classes: pageClasses } = useNewNotificationPageStyles();
  const { setQueryParam } = useQueryParams();

  const handleNewActionClick = () => {
    setQueryParam(EDITING_KEY, 'new-action');
  };

  return (
    <div className={classes.root}>
      <WhyLabsText className={classes.headerText}>
        Notification actions are managed from this page. Actions can be specified in the{' '}
        <pre className={classes.codeLine}>monitor.actions</pre> path of a monitor&apos;s configuration file.
      </WhyLabsText>
      <WhyLabsButton variant="filled" className={pageClasses.buttonOrangeGradient} onClick={handleNewActionClick}>
        New action
      </WhyLabsButton>
    </div>
  );
};
