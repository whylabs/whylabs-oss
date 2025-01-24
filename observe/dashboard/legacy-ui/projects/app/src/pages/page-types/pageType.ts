export const PageBases = {
  resources: '/resources',
  settings: '/settings',
  getStarted: '/get-started',
  tutorials: '/tutorials',
  admin: '/admin',
  newUser: '/new-user',
  unverifiedEmail: '/unverified-email',
  chartPlayground: '/chart-playground',
  designPlayground: '/design-playground',
  notFound: '/404',
  summary: '/summary',
  howToUseMobile: '/how-to-use-mobile',
};

export const RelativeOldPages = {
  models: 'models',
  assets: 'assets',
  accessToken: 'access-token',
  modelSettings: 'model-settings',
  userSettings: 'user-settings',
  featuresList: 'features',
};

export const DeprecatedPages = {
  investigator: '/investigator',
};

export const PathReplaces = {
  assetToResources: {
    old: 'assets',
    new: 'resources',
  },
  modelToResources: {
    old: 'models',
    new: 'resources',
  },
  columns: {
    old: 'features',
    new: 'columns',
  },
};

export const Pages = {
  // top level page
  dashboard: PageBases.resources,
  executive: PageBases.summary,
  modelsSummary: `${PageBases.summary}/models`,
  datasetsSummary: `${PageBases.summary}/datasets`,
  customDashboards: `${PageBases.summary}/dashboards`,
  // settings
  globalSettings: PageBases.settings,
  accessToken: `${PageBases.settings}/access-tokens`,
  notifications: `${PageBases.settings}/notifications`,
  notificationAction: `${PageBases.settings}/notifications/:actionType/:passedId`,
  modelSettings: `${PageBases.settings}/model-management`,
  userSettings: `${PageBases.settings}/user-management`,
  integrationSettings: `${PageBases.settings}/integrations`,

  // model pages
  resource: `${PageBases.resources}/:modelId`,
  features: `${PageBases.resources}/:modelId/columns`,
  performance: `${PageBases.resources}/:modelId/performance`,
  dataProfile: `${PageBases.resources}/:modelId/profiles/`,
  explainability: `${PageBases.resources}/:modelId/explainability`,
  constraints: `${PageBases.resources}/:modelId/constraints`,
  llmDashboards: `${PageBases.resources}/:modelId/dashboards`,
  llmSecurityDashboard: `${PageBases.resources}/:modelId/dashboards/security`,
  llmPerformanceDashboard: `${PageBases.resources}/:modelId/dashboards/performance`,
  resourceCustomDashboard: `${PageBases.resources}/:modelId/:dashboardId`,
  llmCustomDashboard: `${PageBases.resources}/:modelId/dashboards/:dashboardId`,
  llmSegmentAnalysisDashboard: `${PageBases.resources}/:modelId/dashboards/segment-analysis`,
  segmentListing: `${PageBases.resources}/:modelId/segments`,
  output: `${PageBases.resources}/:modelId/output`,
  summary: `${PageBases.resources}/:modelId/summary`,
  monitorManager: `${PageBases.resources}/:modelId/monitor-manager`,
  monitorManagerPresets: `${PageBases.resources}/:modelId/monitor-manager/presets`,
  monitorManagerAnomaliesFeed: `${PageBases.resources}/:modelId/monitor-manager/anomalies-feed`,
  monitorManagerMonitorRuns: `${PageBases.resources}/:modelId/monitor-manager/monitor-runs`,
  monitorManagerConfigInvestigator: `${PageBases.resources}/:modelId/monitor-manager/config-investigator`,
  monitorManagerCustomConfigInvestigator: `${PageBases.resources}/:modelId/monitor-manager/config-investigator/:monitorId`,
  monitorManagerCustomize: `${PageBases.resources}/:modelId/monitor-manager/customize-ui`,
  monitorManagerCustomizeExisting: `${PageBases.resources}/:modelId/monitor-manager/customize-ui/:passedId`,
  monitorManagerCustomizeJson: `${PageBases.resources}/:modelId/monitor-manager/customize-json`,
  monitorManagerCustomizeJsonPreset: `${PageBases.resources}/:modelId/monitor-manager/customize-json/:passedId`,

  // Getting started:
  getStarted: PageBases.getStarted,

  // model output pages
  outputFeature: `${PageBases.resources}/:modelId/output/:outputName`,

  // segment pages
  segment: `${PageBases.resources}/:modelId/segments/:segment/columns`,
  segmentLlmDashboards: `${PageBases.resources}/:modelId/segments/:segment/dashboards`,
  segmentLlmSecurityDashboard: `${PageBases.resources}/:modelId/segments/:segment/dashboards/security`,
  segmentLlmPerformanceDashboard: `${PageBases.resources}/:modelId/segments/:segment/dashboards/performance`,
  segmentLlmCohortsDashboard: `${PageBases.resources}/:modelId/segments/:segment/dashboards/cohorts`,
  segmentResourceCustomDashboard: `${PageBases.resources}/:modelId/segments/:segment/:dashboardId`,
  segmentLlmCustomDashboard: `${PageBases.resources}/:modelId/segments/:segment/dashboards/:dashboardId`,
  segmentPerformance: `${PageBases.resources}/:modelId/segments/:segment/performance`,
  segmentConstraints: `${PageBases.resources}/:modelId/segments/:segment/constraints`,
  segmentOutput: `${PageBases.resources}/:modelId/segments/:segment/output`,
  segmentDataProfile: `${PageBases.resources}/:modelId/segments/:segment/profiles/`,

  // segment output pages
  segmentOutputFeature: `${PageBases.resources}/:modelId/segments/:segment/output/:outputName`,

  // feature pages
  feature: `${PageBases.resources}/:modelId/columns/:featureId`,
  featureCompare: `${PageBases.resources}/:modelId/columns/:featureId/compare`,

  // segment feature pages
  segmentFeature: `${PageBases.resources}/:modelId/segments/:segment/columns/:featureId`,
  segmentFeatureCompare: `${PageBases.resources}/:modelId/segments/:segment/columns/:featureId/compare`,

  // new segment-analysis
  segmentAnalysis: `${PageBases.resources}/:modelId/segment-analysis`,

  // design playground page
  designPlayground: PageBases.designPlayground,

  // misc
  notFound: PageBases.notFound,
} as const;

export const RelativePages = {
  // top level page
  dashboard: PageBases.resources,
  executive: PageBases.summary,
  modelsSummary: 'models',
  datasetsSummary: 'datasets',
  customDashboards: 'dashboards',

  // settings
  globalSettings: PageBases.settings,
  accessToken: 'access-tokens',
  notifications: 'notifications',
  notificationAction: ':actionType/:passedId',
  modelSettings: 'model-management',
  userSettings: 'user-management',
  integrationSettings: 'integrations',

  // model pages
  resource: ':modelId',
  features: 'columns',
  performance: 'performance',
  constraints: 'constraints',
  dataProfile: 'profiles',
  monitorSettings: 'monitor-settings',
  monitorSettingsAuditLog: 'monitor-settings/audit-log',
  explainability: 'explainability',
  llmDashboards: 'dashboards',
  llmSecurityDashboard: 'dashboards/security',
  llmPerformanceDashboard: 'dashboards/performance',
  llmSegmentAnalysisDashboard: 'dashboards/segment-analysis',
  segmentListing: 'segments',
  output: 'output',
  summary: 'summary',
  monitorManager: 'monitor-manager',
  monitorManagerPresets: 'presets',
  monitorManagerAnomaliesFeed: 'anomalies-feed',
  monitorManagerMonitorRuns: 'monitor-runs',
  monitorManagerConfigInvestigator: 'config-investigator',
  monitorManagerCustomConfigInvestigator: ':monitorId',
  monitorManagerCustomize: 'customize-ui',
  monitorManagerCustomizeExisting: ':passedId',
  monitorManagerCustomizeJson: 'customize-json',
  monitorManagerCustomizeJsonPreset: ':passedId',

  // model output pages
  outputFeature: ':outputName',

  // segment pages
  segment: 'columns',
  segmentPerformance: 'performance',
  segmentConstraints: 'constraints',
  segmentOutput: 'output',
  segmentLlmDashboards: 'dashboards',
  segmentDataProfile: 'profiles/',

  // segment output pages
  segmentOutputFeature: 'output/:outputName',

  // feature pages
  feature: ':featureId',
  featureCompare: 'compare',

  // segment feature pages
  segmentFeature: 'columns/:featureId',
  segmentFeatureCompare: 'compare',

  // new segment analysis
  segmentAnalysis: 'segment-analysis',

  // get started login flow
  demoModelProvisioning: '/get-started/provisioning-model/:demoName',

  // creating a demo model page
  demoModel: '/demo-model/:demoName',

  // design playground page
  designPlayground: PageBases.designPlayground,

  // misc
  notFound: PageBases.notFound,
} as const;

export type PageType = keyof typeof Pages;

export function getAllPageTypes(): PageType[] {
  return Object.keys(Pages).map((k) => k as PageType);
}

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];
export const PageTypePairs = Object.entries(Pages) as Entries<typeof Pages>;
