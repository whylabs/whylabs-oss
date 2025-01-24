export const TooltipSpacer = (): JSX.Element => <span style={{ display: 'block', height: 8 }} />;

export const tooltips = {
  //
  // Overview page tooltips
  //
  model_overview_page_latest_profile: 'The freshness is the date of the last uploaded profile to this project',
  model_overview_total_anomalies_widget:
    'The total number of anomalies detected by all monitors across all resources over the active date range.',
  model_overview_page_alert_by_type:
    'A visualization showing the types of anomalies occuring over the selected time range',
  model_overview_page_alerts_in_range:
    'A visualization and count of the total anomalies occurring in the applied time range',
  model_overview_page_last_alert_time: 'The timestamp for the most recent anomaly',
  model_overview_page_view_output: 'The total number of outputs',
  model_overview_page_tags: 'The tags that have been applied to this model',
  model_overview_page_batch_frequency: 'The granularity for data retrieval and monitoring',
  model_overview_page_total_segments: 'The total number of segments',
  model_overview_page_total_features: 'The total number of inputs or columns',
  model_overview_page_model_type: 'Type of model',
  model_overview_page_resource_type: 'Type of resource',
  model_overview_page_profiles_lineage:
    'A single date range that represents the lineage for all profiles that have been uploaded for this model, from the oldest profile to the most recent profile.',
  model_overview_page_ref_profile_count: 'The number of reference profiles that have been uploaded for this resource.',

  // Model segment feature page tooltips
  model_feature_page_total_alerts:
    'The total number of anomalies for all monitors on this segment, over the active date range.',

  //
  // Model - feature page tooltips
  //
  model_feature_page_feature: 'The model name and ID',
  resource_feature_page_feature: 'The resource name and ID',

  //
  // Monitor table header cell tooltips
  //
  monitor_table_status_col: 'Toggle to enable the monitor to run at the next scheduled time',
  monitor_table_monitor_name_col: 'The name of the monitor as set in the monitor configuration',
  monitor_table_last_modified_col: 'The timestamp that the monitor configuration was last modified',
  monitor_table_schedule_col:
    'The schedule which the monitor runs as determined by your plan. For example, the Starter plan only supports daily monitor schedules',
  monitor_table_monitor_baseline_col:
    'The type of baseline that has been set for the monitor, where IDs are static reference profiles',
  monitor_table_anomaly_activity_col:
    'The number of anomaly detected in each batch shown as a chart, for the selected date range',
  monitor_table_monitor_actions_col:
    'The type of actions that will be triggered by the monitor when anomalies are detected',
  monitor_table_user_actions_col:
    'The actions a user can take to manage the monitor in the user interface, shown on row hover',

  //
  // Monitoring page tooltips
  //
  monitoring_defaults_baseline: 'Baseline can be set to a trailing window or to a reference profile',
  segment_total_alerts: 'The total number of anomalies over the selected date range',

  // Segment page tooltips
  segment_total_count: 'The total number of segments',

  //
  // Model alert page
  //
  alertTimestamp: 'The time of the data profile that triggered this alert.',
  alertType:
    'The type of the alert. Alerts can be of type Data Type, Distribution, Missing Value, Unique, or Missing Data', // TODO sam, update content
  alertDetails: 'The reason that the alert was triggered.',
  alertFeature: 'The feature of the model that the alert was triggered on.',

  anomalyTimestamp: 'The time of the data profile that triggered this anomaly.',
  anomalyTarget: 'The name of the column, input feature, or output that triggered the anomaly.',
  anomalyAnalyzerType: 'The type and algorithm name of the analyzer run.',
  anomalyMetric: 'The data type targeted for this analyzer.',
  anomalyDetails: 'The data conditions that triggered this analyzer.',
  eventDescription: 'The data conditions observed in this event.',
  anomalyMonitorName:
    'The display name of the monitor, configurable in the monitor manager. In some special cases, an analyzer can trigger more than one monitor. We fall back to ' +
    'the monitor ID if the name is not set.',
  anomalySeverity:
    'The severity of the monitor triggered by the anomaly. In the event that multiple monitors are triggered, the severities will be listed in descending order.',
  anomalySegment: 'The user-defined segment that partitions the dataset',
  anomalyNotificationTypes: 'The actions the monitor takes when it detects anomalies.',

  //
  // Monitor runs
  //
  monitor_runs_run_completed: 'The time when this monitor run completed.',
  monitor_runs_column_count: 'How many columns were analyzed by the monitor.',
  monitor_runs_anomaly_count:
    'How many anomalies were identified in all of the profiles processed in this monitor run.',
  monitor_runs_messages: 'Messages about errors that occurred during this monitor run.',
  monitor_runs_analyzer_id: 'Identifier used by WhyLabs to identify an analysis performed by a monitor.',
  monitor_runs_run_id: 'Identifier used by WhyLabs to identify a specific run of a monitor.',
  monitor_runs_analysis_type: 'The type of analysis performed by this monitor',

  // Monitor Action Buttons
  monitor_action_delete_disabled: 'Delete monitor is disabled',
  monitor_action_delete: 'Delete monitor',
  monitor_action_view: 'View anomaly feed',
  monitor_action_edit_disabled: 'Edit monitor is disabled',
  monitor_action_edit_not_supported: 'This monitor cannot be edited via the UI builder',
  monitor_action_preset_edit_disabled: 'This preset monitor cannot be edited via the UI builder',
  monitor_action_edit: 'Edit monitor in the UI builder',
  monitor_action_json: 'View and edit JSON configuration',

  // MV3 Config
  edit_mode_config_disabled: 'To change this value, create a new monitor',
  config_coming_soon: 'Contact WhyLabs to enable this option',
  refrence_profile_disabled: 'No static profiles available. Upload a static profile via API to set as a baseline',
  config_feature_type_disabled: 'No features of this type are present in the data',
  config_feature_both_type_disabled: 'Drift monitors must target either discrete or non-discrete features',

  // Explainability
  global_feature_importance: 'Values are normalized to be between 0 and 1 if not already within this range',
  hasNoPermissionToCreateMonitor: 'You need member or administrator permissions to create monitors',
} as const;
