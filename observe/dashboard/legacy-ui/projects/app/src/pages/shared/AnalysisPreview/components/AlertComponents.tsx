import { IconAlertCircle, IconAlertTriangle, IconInfoCircle, IconCircleCheck } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
import { SkeletonGroup, WhyLabsAlert, WhyLabsText } from 'components/design-system';
import React from 'react';
import { createStyles, Loader } from '@mantine/core';
import { formatUtcDateString } from 'utils/dateUtils';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { Monitor } from 'generated/monitor-schema';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useAdHoc } from 'atoms/adHocAtom';
import { useGetSegmentAlertCountQuery } from 'generated/graphql';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { renderColumnText } from '../utils';

type CommonAlertProps = {
  displayed?: boolean;
  onClose?: () => void;
};
const useStyles = createStyles(() => ({
  alertError: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.57,
    letterSpacing: '0.14px',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.57,
    letterSpacing: '0.14px',
  },
  colorBlue: {
    color: Colors.blue,
  },
  colorWhite: {
    color: Colors.white,
  },
  alertContent: {
    padding: '13px 15px',
  },
  alertList: {
    paddingLeft: 20,
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.57,
    letterSpacing: '-0.14px',
    margin: 0,
  },
  editRangeCTA: {
    color: Colors.linkColor,
    fontFamily: 'Asap, sans-serif',
  },
  spaceBetweenFlex: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
  },
}));
export const LightErrorAlert = ({
  message,
  displayed,
  onClose,
}: { message?: string | null } & CommonAlertProps): JSX.Element | null => {
  const { classes } = useStyles();

  if (!displayed || !message) return null;

  return (
    <WhyLabsAlert
      dismissible
      icon={<IconAlertTriangle color={Colors.red} />}
      backgroundColor={Colors.lightRed}
      title={<WhyLabsText className={classes.alertError}>{message}</WhyLabsText>}
      onClose={onClose}
    />
  );
};

type PreviewInfoAlertProps = {
  editRange: () => void;
  dateRange: SimpleDateRange;
  hasBackfillFlag?: boolean;
};
export const PreviewInfoAlert = ({ editRange, dateRange, hasBackfillFlag }: PreviewInfoAlertProps): JSX.Element => {
  const { classes, cx } = useStyles();
  return (
    <WhyLabsAlert
      title={
        <WhyLabsText className={cx(classes.alertTitle, classes.colorBlue)}>About the preview analysis</WhyLabsText>
      }
      backgroundColor={Colors.brandSecondary100}
      icon={<IconInfoCircle color={Colors.blue} size={20} />}
      className={classes.alertContent}
      dismissible
    >
      <ul className={classes.alertList}>
        <li>
          It will run on the range: {formatUtcDateString(dateRange.from)} - {formatUtcDateString(dateRange.to - 1)}; to
          edit the range{' '}
          <InvisibleButton className={classes.editRangeCTA} onClick={editRange}>
            click here
          </InvisibleButton>
        </li>
        <li>It runs on the currently selected segment for the currently visible features or columns</li>
        {hasBackfillFlag && (
          <li>After previewing you will have the option to request a backfill job with the same monitor settings</li>
        )}
      </ul>
    </WhyLabsAlert>
  );
};

type LoadingPreviewAlertProps = {
  columnCountText: string;
} & CommonAlertProps;
export const LoadingPreviewAlert = ({ columnCountText, displayed }: LoadingPreviewAlertProps): JSX.Element | null => {
  const { classes, cx } = useStyles();

  if (!displayed) return null;

  return (
    <WhyLabsAlert
      icon={<IconInfoCircle color={Colors.white} size={20} />}
      backgroundColor={Colors.chartBlue}
      className={classes.alertContent}
      title={
        <div className={classes.spaceBetweenFlex}>
          <WhyLabsText className={cx(classes.alertTitle, classes.colorWhite)}>
            Preview analysis running on {columnCountText}
          </WhyLabsText>
          <Loader size={20} color={Colors.white} />
        </div>
      }
    />
  );
};

type CriticalErrorAlertProps = {
  message: string;
} & CommonAlertProps;
export const CriticalErrorAlert = ({ message, displayed }: CriticalErrorAlertProps): JSX.Element | null => {
  const { classes, cx } = useStyles();

  if (!displayed) return null;

  return (
    <WhyLabsAlert
      icon={<IconAlertCircle color={Colors.white} size={20} />}
      backgroundColor={Colors.red}
      className={classes.alertContent}
      title={<WhyLabsText className={cx(classes.alertTitle, classes.colorWhite)}>{message}</WhyLabsText>}
    />
  );
};

type SuccessAlertProps = {
  message: string;
} & CommonAlertProps;
export const SuccessAlert = ({ message, displayed }: SuccessAlertProps): JSX.Element | null => {
  const { classes, cx } = useStyles();

  if (!displayed) return null;

  return (
    <WhyLabsAlert
      icon={<IconCircleCheck color={Colors.white} size={20} />}
      backgroundColor={Colors.green}
      className={classes.alertContent}
      title={<WhyLabsText className={cx(classes.alertTitle, classes.colorWhite)}>{message}</WhyLabsText>}
    />
  );
};

type PreviewResultAlertProps = {
  columnCount: number;
  selectedMonitors: Monitor[];
  isComprehensivePreview: boolean;
};
export const PreviewResultAlert = ({
  columnCount,
  selectedMonitors,
  isComprehensivePreview,
}: PreviewResultAlertProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { modelId, segment, pageType } = usePageTypeWithParams();
  const [runId] = useAdHoc(modelId, undefined, segment, pageType);
  const isOutputs = pageType === 'segmentOutputFeature' || pageType === 'outputFeature';
  const { dateRange } = useSuperGlobalDateRange();

  const { data, loading } = useGetSegmentAlertCountQuery({
    variables: {
      model: modelId,
      tags: segment?.tags ?? [],
      ...dateRange,
      adHocRunId: runId,
    },
  });

  const totalAdhocAnomalies = data?.model?.segment?.anomalyCounts?.totals?.reduce((acc, curr) => acc + curr.count, 0);

  const renderPreviewedMonitors = () => {
    if (isComprehensivePreview)
      return (
        <>
          <strong>All monitors</strong> were previewed
        </>
      );
    const names = selectedMonitors?.reduce((acc, curr) => {
      const name = curr.displayName ?? curr.id ?? 'Unknown';
      return acc ? acc.concat(`, ${name}`) : name;
    }, '');
    return (
      <>
        <strong>{names}</strong> {selectedMonitors?.length > 1 ? 'were' : 'was'} previewed
      </>
    );
  };

  return (
    <WhyLabsAlert
      title={
        <WhyLabsText className={cx(classes.alertTitle, classes.colorWhite)}>
          Currently viewing a preview analysis of {columnCount} {renderColumnText(isOutputs, columnCount)}
        </WhyLabsText>
      }
      backgroundColor={Colors.chartOrange}
      icon={<IconInfoCircle color={Colors.white} size={20} />}
      className={classes.alertContent}
    >
      {loading ? (
        <SkeletonGroup count={2} height={18} width="100%" mt={4} />
      ) : (
        <ul className={cx(classes.alertList, classes.colorWhite)}>
          <li>
            {totalAdhocAnomalies === 1
              ? `${totalAdhocAnomalies} preview anomaly was detected`
              : `${totalAdhocAnomalies} preview anomalies were detected`}
          </li>
          <li>{renderPreviewedMonitors()}</li>
        </ul>
      )}
    </WhyLabsAlert>
  );
};

export const BackfillInfoAlert = (): JSX.Element => {
  const { classes, cx } = useStyles();
  return (
    <WhyLabsAlert
      title={<WhyLabsText className={cx(classes.alertTitle, classes.colorBlue)}>Analysis backfill details</WhyLabsText>}
      backgroundColor={Colors.brandSecondary100}
      icon={<IconInfoCircle color={Colors.blue} size={20} />}
      className={classes.alertContent}
    >
      <ul className={classes.alertList}>
        <li>The backfill range defaults to the previewed date range, but can be changed above</li>
        <li>Previous analysis results will be deleted</li>
        <li>A backfill can&apos;t be undone after it has started</li>
        <li>Stopping the backfill while in progress, will result in partially backfilled analysis</li>
        <li>The backfill will run on all columns and segments targeted by the selected monitor</li>
        <li>Backfills for larger data volumes take longer to complete</li>
      </ul>
    </WhyLabsAlert>
  );
};

type LoadingBackfillAlertProps = {
  columnCountText: string;
  segmentCount?: number;
  isQueued: boolean;
} & CommonAlertProps;
export const LoadingBackfillAlert = ({
  columnCountText,
  segmentCount,
  displayed,
  isQueued,
}: LoadingBackfillAlertProps): JSX.Element | null => {
  const { classes, cx } = useStyles();

  if (!displayed) return null;

  const segmentText = (() => {
    if (segmentCount ?? 0 > 1) {
      return `and ${segmentCount} segments`;
    }
    return '';
  })();

  const renderTitle = () => {
    if (isQueued) return 'Analysis backfill request is queued';
    return `Analysis backfill is running on ${columnCountText} ${segmentText}`;
  };

  return (
    <WhyLabsAlert
      icon={<IconInfoCircle color={Colors.white} size={20} />}
      backgroundColor={Colors.chartBlue}
      className={classes.alertContent}
      title={
        <div className={classes.spaceBetweenFlex}>
          <WhyLabsText className={cx(classes.alertTitle, classes.colorWhite)}>{renderTitle()}</WhyLabsText>
          <Loader size={20} color={Colors.white} />
        </div>
      }
    />
  );
};
