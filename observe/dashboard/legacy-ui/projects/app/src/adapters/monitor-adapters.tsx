import {
  Analyzer,
  CronSchedule,
  DatasetMetric,
  FixedCadenceSchedule,
  Granularity,
  ImmediateSchedule,
  Monitor,
} from 'generated/monitor-schema';
import { GetModelReferenceProfilesForMonitorConfigQuery, TimePeriod } from 'generated/graphql';
import { ID_DISPLAY_NAME_MAP } from 'components/panels/monitoring/monitor-manager/constants/presetUtils';
import { AnalyzerConfig } from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import { utcFormat } from 'd3-time-format';
import { batchFrequencyToUnitText } from 'utils/timeUtils';
import { analyzerHasBaseline } from 'hooks/useCustomMonitor/monitorUtils';

export function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function datasetMetricToText(metric: DatasetMetric | string): string {
  // TODO: Map other metrics as well
  switch (metric) {
    case 'classification.accuracy':
      return 'Accuracy';
    case 'classification.precision':
      return 'Precision';
    case 'classification.f1':
      return 'F1 Score';
    case 'classification.recall':
      return 'Recall';
    case 'classification.fpr':
      return 'False Positive Rate';
    case 'classification.auroc':
      return 'Area Under ROC';
    case 'regression.mae':
      return 'Mean Absolute Error';
    case 'regression.mse':
      return 'Mean Squared Error';
    case 'regression.rmse':
      return 'Root Mean Squared Error';
    default:
      return metric;
  }
}

export function scheduleToText(schedule: FixedCadenceSchedule | CronSchedule | ImmediateSchedule | undefined): string {
  switch (schedule?.type) {
    case 'cron':
      return schedule.cron;
    case 'fixed':
      return capitalize(schedule.cadence);
    case 'immediate':
      return 'Immediate';
    default:
      console.log('Monitor schedule type is undefined');
      return 'N/A';
  }
}

function timeAdjectiveToUnit(adjective: FixedCadenceSchedule['cadence']): string {
  switch (adjective) {
    case 'hourly':
      return 'hour';
    case 'daily':
      return 'day';
    case 'monthly':
      return 'month';
    case 'weekly':
      return 'week';
  }
  return '';
}

function scheduleAndBatchFrequencyToText(
  monitorSchedule: FixedCadenceSchedule | CronSchedule | ImmediateSchedule,
  modelFrequency: TimePeriod | undefined,
): string {
  if ('cadence' in monitorSchedule) {
    const valueFromMonitor = timeAdjectiveToUnit(monitorSchedule.cadence);
    if (valueFromMonitor) {
      return valueFromMonitor;
    }
  }
  return batchFrequencyToUnitText(modelFrequency) ?? 'unit';
}

export function analyzerConfigToBaselineText(
  config: AnalyzerConfig,
  monitorSchedule: FixedCadenceSchedule | CronSchedule | ImmediateSchedule,
  modelFrequency?: TimePeriod,
  profilesData?: GetModelReferenceProfilesForMonitorConfigQuery,
): string {
  if (config.type === 'fixed' || !analyzerHasBaseline(config)) return 'N/A';

  if (config.baseline?.type === 'TrailingWindow') {
    return `${config.baseline.size}-${scheduleAndBatchFrequencyToText(
      monitorSchedule,
      modelFrequency,
    )} trailing window`;
  }
  if (config.baseline?.type === 'Reference' && profilesData) {
    const { profileId } = config.baseline;
    const referenceProfile = profilesData.model?.referenceProfiles?.find((profile) => profile.id === profileId);
    return referenceProfile?.alias ?? 'Invalid reference profile';
  }
  if (config.baseline?.type === 'TimeRange') {
    const { start, end } = config.baseline.range;
    const isHourly = modelFrequency === TimePeriod.Pt1H;
    const startString = utcFormat(`%m-%d-%Y${isHourly ? ' %I:%M %p' : ''}`)(new Date(start));
    const endString = utcFormat(`%m-%d-%Y${isHourly ? ' %I:%M %p' : ''}`)(new Date(end));
    return `${startString} \u2013${isHourly ? '\n' : ' '}${endString} UTC`;
  }
  console.log('Failed to convert analyzer config to baseline text. config:', config);
  return 'N/A';
}

export function createDefaultPresetMonitor(
  analyzerId: string,
  monitorName: string,
  enableSlackNotifications: boolean,
  enableEmailNotifications: boolean,
  emailId?: string,
  slackId?: string,
): Monitor {
  const displayName = ID_DISPLAY_NAME_MAP.get(analyzerId);
  const monitor: Monitor = {
    id: monitorName,
    displayName,
    analyzerIds: [analyzerId],
    schedule: {
      type: 'immediate',
    },
    mode: { type: 'DIGEST' },
    disabled: false,
    actions: [],
  };

  if (enableEmailNotifications && emailId) monitor.actions = [{ type: 'global', target: emailId }];
  if (enableSlackNotifications && slackId) monitor.actions = [...monitor.actions, { type: 'global', target: slackId }];

  if (enableSlackNotifications && enableEmailNotifications && monitor.actions.length === 0)
    console.log('Created monitor without actions, missing email and slack');

  return monitor;
}

export function timePeriodToGranularity(timePeriod: TimePeriod): Granularity {
  switch (timePeriod) {
    case TimePeriod.P1D:
      return 'daily';
    case TimePeriod.Pt1H:
      return 'hourly';
    case TimePeriod.P1W:
      return 'weekly';
    case TimePeriod.P1M:
      return 'monthly';
    default: {
      console.log('Failed to convert TimePeriod to Granularity, defaulted to daily');
      return 'daily';
    }
  }
}

export function monitorLastUpdated(monitor: Monitor, analyzers: Analyzer[]): number {
  return Math.max(...analyzers.map((a) => a.metadata?.updatedTimestamp ?? 0), monitor.metadata?.updatedTimestamp ?? 0);
}
