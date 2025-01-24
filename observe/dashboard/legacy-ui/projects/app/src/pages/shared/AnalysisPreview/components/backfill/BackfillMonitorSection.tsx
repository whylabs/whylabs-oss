import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import React from 'react';

const useStyles = createStyles({
  root: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  title: {
    color: Colors.secondaryLight900,
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.14,
  },
  listTitle: {
    color: Colors.brandSecondary900,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.14,
  },
  monitorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  monitorNameContainer: {
    borderLeft: `2px solid ${Colors.brandSecondary200}`,
    paddingLeft: 10,
  },
  monitorName: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
  },
});

const titleTooltip = 'The monitor is determined by the monitor that was selected for the preview.';
const monitorListTooltip =
  'The backfill analysis will use the monitor configuration for previewed monitor. The selected monitor is the one that was used for the preview analysis; seasonal monitors aren’t supported.';

export const BackfillMonitorSection = ({
  selectedMonitors,
  isComprehensivePreview,
  isQueued,
}: {
  selectedMonitors: string[];
  isComprehensivePreview?: boolean;
  isQueued: boolean;
}): React.ReactElement => {
  const { classes } = useStyles();
  const MonitorName = ({ name }: { name: string }): JSX.Element => (
    <div className={classes.monitorNameContainer}>
      <WhyLabsText className={classes.monitorName}>{name}</WhyLabsText>
    </div>
  );

  const renderMonitorNames = () => {
    if (isComprehensivePreview) return <MonitorName name="All monitors" />;
    if (isQueued) return <WhyLabsText className={classes.monitorName}>Planning...</WhyLabsText>;
    return selectedMonitors.map((name) => <MonitorName name={name} key={name} />);
  };

  return (
    <div className={classes.root}>
      <WhyLabsText className={classes.title}>
        Run an analysis backfill
        <HtmlTooltip topOffset="-10px" tooltipContent={titleTooltip} />
      </WhyLabsText>
      <div className={classes.monitorsList}>
        <WhyLabsText className={classes.listTitle}>
          Backfill monitor
          <HtmlTooltip topOffset="-8px" tooltipContent={monitorListTooltip} />
        </WhyLabsText>
        {renderMonitorNames()}
      </div>
    </div>
  );
};
