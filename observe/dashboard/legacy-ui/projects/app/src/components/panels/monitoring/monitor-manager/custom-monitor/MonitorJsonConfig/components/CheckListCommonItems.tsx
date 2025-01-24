import { HtmlTooltip, SafeLink } from '@whylabs/observatory-lib';

export const ADVANCED_DOC_LINK = 'https://docs.whylabs.ai/docs/advanced-monitor-configuration';

export const mountDocumentationTooltip = (link: `http${string}`): JSX.Element => {
  return (
    <HtmlTooltip
      tooltipContent={
        <span>
          See{' '}
          <SafeLink style={{ color: 'white' }} href={link}>
            documentation
          </SafeLink>{' '}
          for more details
        </span>
      }
    />
  );
};

export const commonConfigurationSteps = {
  review_monitor_display_name_and_severity: (
    <li>
      Review the monitor <pre>displayName</pre> and <pre>severity</pre>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration#severity')}
    </li>
  ),
  set_monitor_actions: (
    <li>
      Set the monitor <pre>actions</pre>
      <span className="red-text"> **</span>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration#notification-actions')}
    </li>
  ),
  review_analyzer_config_threshold: (
    <li>
      Review the analyzer <pre>config.threshold</pre>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#percent')}
    </li>
  ),
  set_analyzer_baseline_profile_id: (
    <li>
      Set the analyzer <pre>config.baseline.profileId</pre>
      <span className="red-text"> **</span>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#reference-profiles')}
    </li>
  ),
  optionally_change_analyzer_target_matrix: (
    <li>
      Optionally change the analyzer <pre>targetMatrix</pre>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns')}
    </li>
  ),
  set_analyzer_target_matrix_type: (
    <li>
      Set the analyzer <pre>targetMatrix.type</pre> to &quot;column&quot; or &quot;dataset&quot;
      <span className="red-text"> **</span>
    </li>
  ),
  if_targeting_columns: (
    <li>
      If targeting &quot;column&quot; set the <pre>targetMatrix.include</pre> and <pre>targetMatrix.exclude</pre> lists
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns')}
    </li>
  ),
  set_config_type: (
    <li>
      Set the analyzer <pre>config.type</pre>
      <span className="red-text"> **</span>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#targeting-columns')}
    </li>
  ),
  review_analyzer_data_readiness_duration: (
    <li>
      Review the analyzer <pre>dataReadinessDuration</pre>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#missing-data')}
    </li>
  ),
  review_analyzer_config_upper: (
    <li>
      Review the analyzer <pre>config.upper</pre>
      {mountDocumentationTooltip(
        'https://docs.whylabs.ai/docs/advanced-monitor-configuration/#seconds-since-last-upload',
      )}
    </li>
  ),
  review_analyzer_config_factor: (
    <li>
      Review the analyzer <pre>config.factor</pre>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#standard-deviations')}
    </li>
  ),
  set_config_metric_and_others: (
    <li>
      Set the <pre>config.metric</pre> and other settings as needed based on the documentation
      <span className="red-text"> **</span>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration')}
    </li>
  ),
  update_baseline: (
    <li>
      Update the analyzer <pre>config.baseline</pre>, or remove if config type is &quot;fixed&quot;
      <span className="red-text"> **</span>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration')}
    </li>
  ),
  update_analyzer_baseline_range: (
    <li>
      Update the analyzer <pre>config.baseline.range</pre>
      <span className="red-text"> **</span>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#fixed-time-range')}
    </li>
  ),
  review_trailing_window_size: (
    <li>
      Review the analyzer trailing window <pre>config.baseline.size</pre>
      {mountDocumentationTooltip('https://docs.whylabs.ai/docs/advanced-monitor-configuration/#trailing-windows')}
    </li>
  ),
} as const;
