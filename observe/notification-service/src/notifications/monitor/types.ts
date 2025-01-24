import { MonitorModeType, MonitorSeverity } from './common';
import {
  ActionType,
  EmailNotificationAction,
  EntitySchema,
  ModelMetadataResponse,
  NotificationAction,
  OrganizationMetadata,
  PagerDutyNotificationAction,
  SlackNotificationAction,
  TeamsNotificationAction,
  WebhookNotificationAction,
} from '@whylabs/songbird-node-client';
import { Monitor } from '../../services/data/songbird/songbird-wrapper';

export type MonitorSQSMessage = MonitorEveryAnomalySQSMessage | MonitorDigestSQSMessage;

export type TestNotificationSQSMessage = {
  org_id: string;
  action_id: string;
};

export type NotificationHandler<
  TMetadata1 extends DigestMetadata | EveryAnomalyMetadata,
  TMetadata2 extends
    | EmailNotificationAction
    | SlackNotificationAction
    | TeamsNotificationAction
    | WebhookNotificationAction
    | PagerDutyNotificationAction,
> = (
  messageId: string,
  monitorId: string,
  monitorName: string | undefined,
  metadata: TMetadata1,
  globalAction: TMetadata2,
) => Promise<void>;

export type DigestEmailHandler = NotificationHandler<DigestMetadata, EmailNotificationAction>;
export type DigestPagerDutyHandler = NotificationHandler<DigestMetadata, PagerDutyNotificationAction>;
export type DigestSlackHandler = NotificationHandler<DigestMetadata, SlackNotificationAction>;
export type DigestTeamsHandler = NotificationHandler<DigestMetadata, TeamsNotificationAction>;
export type DigestWebhookHandler = NotificationHandler<DigestMetadata, WebhookNotificationAction>;
export type EveryAnomalyEmailHandler = NotificationHandler<EveryAnomalyMetadata, EmailNotificationAction>;
export type EveryAnomalySlackHandler = NotificationHandler<EveryAnomalyMetadata, SlackNotificationAction>;
export type EveryAnomalyTeamsHandler = NotificationHandler<EveryAnomalyMetadata, TeamsNotificationAction>;
export type EveryAnomalyPagerDutyHandler = NotificationHandler<EveryAnomalyMetadata, PagerDutyNotificationAction>;
export type EveryAnomalyWebhookHandler = NotificationHandler<EveryAnomalyMetadata, WebhookNotificationAction>;

type EmailGlobalAction = NotificationAction & {
  id: string;
  type: ActionType.Email;
  payload: EmailNotificationAction;
};

type PagerDutyGlobalAction = NotificationAction & {
  id: string;
  type: ActionType.PagerDuty;
  payload: PagerDutyNotificationAction;
};

type SlackGlobalAction = NotificationAction & {
  id: string;
  type: ActionType.Slack;
  payload: SlackNotificationAction;
};

type TeamsGlobalAction = NotificationAction & {
  id: string;
  type: ActionType.Teams;
  payload: TeamsNotificationAction;
};

type WebhookGlobalAction = NotificationAction & {
  id: string;
  type: ActionType.Webhook;
  payload: WebhookNotificationAction;
};

export type NotificationMetadata = DigestMetadata | EveryAnomalyMetadata;

export type MetadataProcessor<TMetadata extends DigestMetadata | EveryAnomalyMetadata> = (
  sqsMessage: MonitorSQSMessage,
) => Promise<TMetadata>;

export type GlobalAction =
  | EmailGlobalAction
  | PagerDutyGlobalAction
  | SlackGlobalAction
  | TeamsGlobalAction
  | WebhookGlobalAction;

export const isValidGlobalAction = (action: NotificationAction): action is GlobalAction => {
  const requiredProps: (keyof GlobalAction)[] = ['id', 'type', 'payload'];
  const supportedActionTypes: Set<NotificationAction['type']> = new Set([
    ActionType.Slack,
    ActionType.Email,
    ActionType.PagerDuty,
    ActionType.Teams,
    ActionType.Webhook,
  ]);
  return requiredProps.every((prop) => action[prop] !== undefined) && supportedActionTypes.has(action.type);
};

type BaseNotificationMetadata = {
  id: string;
  runId: string;
  monitorMode: MonitorModeType;
  org: OrganizationMetadata;
  datasetId: string;
  dataset: ModelMetadataResponse | null;
  monitor: Monitor;
  severity: MonitorSeverity;
  schemaVersion: string;
  monitorManagerUrl: string;
  notificationSettingsUrl: string;
  modelAlertsUrl: string;
  modelConstraintsUrl: string;
  modelDashboardUrl: string;
};

export type DigestMetadata = {
  featureAnomalies: FeatureStats[];
  segmentAnomalies: SegmentStats[];
  anomalySample: AnalyzerResult[];
  entitySchema: EntitySchema | null;
  totalAnomalies: number;
  timeRange: string;
  end: number;
  start: number;
} & BaseNotificationMetadata;

export type EveryAnomalyMetadata = {
  analysisId: string;
  feature: string;
  analyzerResult: AnalyzerResult;
} & BaseNotificationMetadata;

export type MonitorDigestSQSMessage = {
  id: string;
  runId: string;
  orgId: string;
  datasetId: string;
  numAnomalies: number;
  monitorId: string;
  severity?: MonitorSeverity;
  mode: string;
  segmentStatistics: SegmentStats[];
  columnStatistics: FeatureStats[];
  oldestAnomalyDatasetTimestamp: number;
  earliestAnomalyDatasetTimestamp: number;
  anomalySample?: AnalyzerResult[];
};

export type FeatureStats = {
  numAnomalies: number;
  column: string;
  analyzerType: string;
  oldestAnomalyDatasetTimestamp: number;
  earliestAnomalyDatasetTimestamp: number;
  url?: string;
};

export type SegmentStats = {
  numAnomalies: number;
  segment: string;
  columns: string[];
  oldestAnomalyDatasetTimestamp: number;
  earliestAnomalyDatasetTimestamp: number;
  url?: string;
};

export type MonitorEveryAnomalySQSMessage = {
  id: string;
  analyzerResult?: AnalyzerResult;
  mode: string;
  severity?: MonitorSeverity;
  monitorId: string;
  orgId: string;
  runId: string;
};

export type AnalyzerResult = {
  __time?: string;
  id: string;
  latest?: boolean | number;
  analysisId: string;
  orgId: string;
  datasetId: string;
  column: string;
  granularity: string;
  segment?: string;
  creationTimestamp: number;
  datasetTimestamp?: number;
  targetLevel?: string;
  anomalyCount: number;
  targetCount?: number;
  targetBatchesWithProfileCount?: number;
  baselineCount?: number;
  baselineBatchesWithProfileCount?: number;
  expectedBaselineCount?: number;
  expectedBaselineSuppressionThreshold?: number;
  isRollup: boolean | number;
  runId: string;
  analyzerId: string;
  metric?: string;
  analyzerType: string;
  algorithm?: string | null;
  algorithmMode?: string | null;
  calculationRuntimeNano?: number;
  analyzerVersion?: string | null;
  monitorIds: string[];
  traceIds?: string[];
  analyzerTags?: string[];
  failureType?: string | null;
  failureExplanation?: string | null;
  weight?: number | null;
  analyzerConfigVersion?: number;
  threshold_baselineMetricValue?: number | string | null;
  threshold_metricValue?: number | string | null;
  threshold_calculatedUpper?: number | string | null;
  threshold_calculatedLower?: number | string | null;
  threshold_absoluteUpper?: number | string | null;
  threshold_absoluteLower?: number | string | null;
  threshold_factor?: number | null;
  threshold_minBatchSize?: number | null;
  childAnalysisIds?: string[];
  childAnalyzerIds?: string[];
  parent?: number;
  columnList_added?: number | null;
  columnList_removed?: number | null;
  columnList_addedSample?: number | null;
  columnList_removedSample?: number | null;
  columnList_mode?: number | null;
  comparison_expected?: string | null;
  comparison_observed?: string | null;
  drift_metricValue?: number | null;
  drift_minBatchSize?: number | null;
  drift_threshold?: number | string | null;
  diff_metricValue?: number | null;
  diff_threshold?: number | string | null;
  diff_mode?: string | null;
  entitySchemaVersion?: number | null;
  analyzerResultType: string;
  base64img?: string | null; // base64
  img_url?: string | null;
  img_expiry_datetime?: Date | null;
  url?: string | null; // link to the anomaly
};
