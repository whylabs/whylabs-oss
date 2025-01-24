// must match Songbird definitions
// TODO: rework notification settings so that this type is used as key for notifications
// and is generated from Songbird code
export enum NotificationType {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  PAGERDUTY = 'PAGER_DUTY',
}

export interface AlertCount {
  prettyType: string; // alert type enum converted to pretty string, i.e. Distribution, Missing values, etc
  count: number;
  alertsUrl: string; // Goes to: models/model-0/alerts?startDate=[dates-of-digest-here]&endDate=[dates-of-digest-here]&filter=distributionAlerts**
}

export interface FeatureAlert {
  featureName: string;
  totalAlertCount: number;
  alertsUrl: string; // Goes to: models/model_name/features/the_first_most_alert_feature?startDate=[dates-of-digest-here]&endDate=[dates-of-digest-here]
}

export interface SegmentAlert {
  segmentText: string;
  totalAlertCount: number;
  alertsUrl: string; // Goes to segment's alerts page
}

export interface ModelNotification {
  datasetId: string;
  name: string; // name of the dataset
  totalAlertCount: number;
  modelDashboardUrl: string; // Goes to: /models/model_name&filter=allAlerts
  modelAlertsUrl: string; // Goes to: models/model-0/alerts?startDate=[dates-of-digest-here]&endDate=[dates-of-digest-here]
  alertCounts: AlertCount[];
  featureAlerts: FeatureAlert[]; // top K features with the most alerts
  segmentAlerts: SegmentAlert[]; // top K segments with the most alerts
}
