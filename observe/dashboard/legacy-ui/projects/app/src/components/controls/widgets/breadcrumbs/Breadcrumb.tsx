import { Breadcrumbs } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { useGetDatasetNameQuery } from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageType, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Link } from 'react-router-dom';
import { displaySegment, UniversalPageParams } from 'pages/page-types/pageUrlQuery';
import { Colors, stringMax } from '@whylabs/observatory-lib';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { PageType } from 'pages/page-types/pageType';
import { WhyLabsText } from 'components/design-system';
import { useUserContext } from 'hooks/useUserContext';
import { AVAILABLE_PRESETS } from 'components/panels/monitoring/monitor-manager/custom-monitor/MonitorJsonConfig/presets/types';

const useStyles = createStyles({
  root: {
    height: '40px',
    maxHeight: '40px',
    minHeight: '40px',
  },
  textDisplay: {
    fontSize: '12px',
    lineHeight: '24px',
    paddingTop: '1px',
    color: Colors.white,
    fontWeight: 300,
  },
  linky: {
    textDecoration: 'underline',
    fontWeight: 300,
  },
  breadcrumb: {
    fontWeight: 300,
    color: Colors.brandPrimary300,
  },
});

export const MAX_CRUMB_LENGTH = 30;

function TextCrumb({ text, overrideLength = MAX_CRUMB_LENGTH }: { text: string; overrideLength?: number }) {
  const { classes: styles } = useStyles();
  return (
    <WhyLabsText inherit className={styles.textDisplay}>
      {stringMax(text, overrideLength)}
    </WhyLabsText>
  );
}

function LinkCrumb({
  text,
  target,
  onClick,
  overrideLength,
}: {
  text: string;
  target: string;
  onClick?: () => void;
  overrideLength?: number;
}) {
  const { classes: styles, cx } = useStyles();
  return (
    <Link className={cx(styles.textDisplay, styles.linky)} color="inherit" to={target} onClick={onClick}>
      {stringMax(text, overrideLength)}
    </Link>
  );
}

interface SupportLinkProps {
  readonly link?: boolean;
}

interface CommonCrumbProps extends SupportLinkProps {
  readonly urlParams: UniversalPageParams;
}

function SegmentListingLinkCrumb({ urlParams }: CommonCrumbProps) {
  const text = 'Segments';
  const { getNavUrl } = useNavLinkHandler();

  return <LinkCrumb text={text} target={getNavUrl({ page: 'segments', modelId: urlParams.modelId })} />;
}

function SegmentListingBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <TextCrumb text="Segments" />
    </Breadcrumbs>
  );
}

function SegmentColumnBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { resourceTexts } = useResourceText(INPUT_LIST_TITLE);
  const { getNavUrl } = useNavLinkHandler();
  const segmentColumnsLink = getNavUrl({
    page: 'columns',
    modelId: urlParams.modelId,
    segmentTags: urlParams.segment,
  });
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <SegmentListingLinkCrumb urlParams={urlParams} />
      <SegmentCrumb urlParams={urlParams} />
      <LinkCrumb text={resourceTexts.title} target={segmentColumnsLink} />
      <TextCrumb text={urlParams.featureId} />
    </Breadcrumbs>
  );
}

const PROFILES_LIST_TITLE = {
  MODEL: {
    title: 'Profiles',
  },
  DATA: {
    title: 'Profiles',
  },
  LLM: {
    title: 'Insight Explorer',
  },
};
function ProfileBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { resourceTexts } = useResourceText(PROFILES_LIST_TITLE);
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <TextCrumb text={resourceTexts.title} />
    </Breadcrumbs>
  );
}

function SegmentProfileBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <SegmentListingLinkCrumb urlParams={urlParams} />
      <SegmentCrumb urlParams={urlParams} />
      <TextCrumb text="Profiles" />
    </Breadcrumbs>
  );
}

function SegmentColumnListBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { resourceTexts } = useResourceText(INPUT_LIST_TITLE);
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <SegmentListingLinkCrumb urlParams={urlParams} />
      <SegmentCrumb urlParams={urlParams} />
      <TextCrumb text={resourceTexts.title} />
    </Breadcrumbs>
  );
}

function SettingsCrumb() {
  const { getNavUrl } = useNavLinkHandler();
  const SETTINGS_TEXT = 'Settings';
  return <LinkCrumb text={SETTINGS_TEXT} target={getNavUrl({ page: 'settings' })} />;
}

function HomeCrumb({ link = true }: { link?: boolean }) {
  const { getNavUrl } = useNavLinkHandler();
  const modelDashboardUrl = getNavUrl({ page: 'home' });
  const pageType = usePageType();
  const RESOURCE_DASH_TEXT = 'Project Dashboard';
  const { getCurrentUser, loading } = useUserContext();
  const user = getCurrentUser();
  const { organization } = user ?? {};

  if (pageType === 'dashboard' || pageType === 'executive') {
    // No home crumb shown for the model dashboard.
    return null;
  }
  const text = loading && !user ? 'Loading...' : `${organization?.name} (${organization?.id})`;
  const usedText = organization ? text : RESOURCE_DASH_TEXT;
  if (link) {
    return <LinkCrumb text={usedText} target={modelDashboardUrl} />;
  }
  return <TextCrumb text={usedText} />;
}

function SegmentCrumb({ urlParams, link }: CommonCrumbProps) {
  const { getNavUrl } = useNavLinkHandler();
  const segmentPageLink = getNavUrl({ page: 'columns', modelId: urlParams.modelId, segmentTags: urlParams.segment });
  const textDisplay = displaySegment(urlParams.segment);
  if (link) {
    return <LinkCrumb text={textDisplay} overrideLength={40} target={segmentPageLink} />;
  }
  return <TextCrumb text={textDisplay} />;
}

// TODO hack to cache model names in memory to avoid the constant jittering we get from
// querying for it without any apollo cache working.
const modelNameCache = new Map<string, string>();
function ResourceCrumb({ urlParams, link }: CommonCrumbProps) {
  const { getNavUrl } = useNavLinkHandler();

  const modelPageLink = getNavUrl({ page: 'summary', modelId: urlParams.modelId });
  const { modelId } = urlParams;
  const { data, loading, error } = useGetDatasetNameQuery({ variables: { datasetId: urlParams.modelId } });

  let modelName = modelNameCache.get(modelId) || modelId;
  if (loading && !modelName) {
    return null;
  }

  if (error) {
    console.error(`Couldn't get model name for model ${urlParams.modelId}`);
  }

  if (data !== undefined) {
    modelName = data?.model?.name || modelName;
    modelNameCache.set(modelId, modelName);
  }

  // Make this a clickable link if this is not the last breadcrumb in the chain
  if (link) {
    return <LinkCrumb text={modelName} target={modelPageLink} />;
  }
  return <TextCrumb text={modelName} />;
}

const INPUT_LIST_TITLE = {
  MODEL: {
    title: 'Inputs',
  },
  DATA: {
    title: 'Columns',
  },
  LLM: {
    title: 'Telemetry Explorer',
  },
};
function ResourceColumnListHomeBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { resourceTexts } = useResourceText(INPUT_LIST_TITLE);
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb urlParams={urlParams} link />
      <TextCrumb text={resourceTexts.title} />
    </Breadcrumbs>
  );
}

function SegmentOutputBreadCrumb({ urlParams, link = false }: CommonCrumbProps) {
  const { getNavUrl } = useNavLinkHandler();
  const outputLink = getNavUrl({ page: 'output', modelId: urlParams.modelId, segmentTags: urlParams.segment });
  const outputText = 'Outputs';
  if (link) {
    return <LinkCrumb target={outputLink} text={outputText} />;
  }
  return <TextCrumb text={outputText} />;
}

function KeysBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <SettingsCrumb />
      <TextCrumb text="Access Tokens" />
    </Breadcrumbs>
  );
}

function NotificationsBreadcrumbs({ link }: SupportLinkProps) {
  const { classes: styles } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const actionsList = getNavUrl({ page: 'settings', settings: { path: 'notifications' } });
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <SettingsCrumb />
      {link ? <LinkCrumb text="Notifications" target={actionsList} /> : <TextCrumb text="Notifications" />}
    </Breadcrumbs>
  );
}

function NotificationActionBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <NotificationsBreadcrumbs link={!!urlParams.passedId} />
      {urlParams.actionType && <TextCrumb text={`${urlParams.passedId} Settings`} />}
    </Breadcrumbs>
  );
}

function ResourceSettingsBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <SettingsCrumb />
      <TextCrumb text="Resources" />
    </Breadcrumbs>
  );
}
function UserSettingsBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <SettingsCrumb />
      <TextCrumb text="User Management" />
    </Breadcrumbs>
  );
}

function IntegrationsSettingsBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <SettingsCrumb />
      <TextCrumb text="Integrations" />
    </Breadcrumbs>
  );
}

function DashboardBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
    </Breadcrumbs>
  );
}
function ModelsDashboardBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb link />
      <TextCrumb text="Model Summary" />
    </Breadcrumbs>
  );
}
function DatasetsDashboardBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb link />
      <TextCrumb text="Dataset Summary" />
    </Breadcrumbs>
  );
}
function MyDashboardBreadcrumbs() {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb link />
      <TextCrumb text="My Dashboards" />
    </Breadcrumbs>
  );
}

function ResourceColumnBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { resourceTexts } = useResourceText(INPUT_LIST_TITLE);
  const columnsLink = getNavUrl({ modelId: urlParams.modelId, page: 'columns' });
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <LinkCrumb text={resourceTexts.title} target={columnsLink} />
      <WhyLabsText inherit className={styles.textDisplay}>{`${urlParams.featureId}`}</WhyLabsText>
    </Breadcrumbs>
  );
}

function ResourceMonitorManagerBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <TextCrumb text="Monitor Manager" />
    </Breadcrumbs>
  );
}
interface ResourceMonitoringSubTabBreadcrumbsParams extends CommonCrumbProps {
  subTabHeading: string;
}
function ResourceMonitorManagerSubTabBreadcrumbs({
  urlParams,
  subTabHeading,
}: ResourceMonitoringSubTabBreadcrumbsParams) {
  const { classes: styles } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const modelUrl = getNavUrl({ page: 'monitorManager', modelId: urlParams.modelId });

  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <LinkCrumb text="Monitor Manager" target={modelUrl} />
      <TextCrumb text={subTabHeading} />
    </Breadcrumbs>
  );
}

function ResourceMonitorManagerJsonEditorBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const modelUrl = getNavUrl({ page: 'monitorManager', modelId: urlParams.modelId });
  const { passedId } = urlParams;
  const isNewMonitor = AVAILABLE_PRESETS.find((p) => p === passedId) || !passedId;
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <LinkCrumb text="Monitor Manager" target={modelUrl} />
      <TextCrumb text={isNewMonitor ? 'New monitor' : 'Edit monitor'} />
    </Breadcrumbs>
  );
}

export const llmPageTypeToLabel = new Map<PageType, string>([
  ['llmSecurityDashboard', 'Security'],
  ['segmentLlmDashboards', 'Security'],
  ['llmDashboards', 'Security'],
  ['segmentLlmSecurityDashboard', 'Security'],
  ['llmSegmentAnalysisDashboard', 'Segment Analysis'],
  ['segmentLlmCohortsDashboard', 'Cohort'],
  ['llmPerformanceDashboard', 'Performance'],
  ['segmentLlmPerformanceDashboard', 'Performance'],
]);
function LLMDashboardsBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const dashPath = llmPageTypeToLabel.get(urlParams.pageType);
  const handleSegments = () => {
    if (urlParams?.segment?.tags?.length) {
      return (
        <>
          <TextCrumb text="Segments" />
          <SegmentCrumb urlParams={urlParams} />
        </>
      );
    }
    return null;
  };
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      {handleSegments()}
      <TextCrumb text="Dashboards" />
      <TextCrumb text={dashPath || 'Custom'} />
    </Breadcrumbs>
  );
}

function ResourceMonitorManagerCustomConfig({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const modelUrl = getNavUrl({ page: 'monitorManager', modelId: urlParams.modelId });
  const configUrl = getNavUrl({
    page: 'monitorManager',
    modelId: urlParams.modelId,
    monitorManager: { path: 'config-investigator' },
  });
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <LinkCrumb text="Monitor Manager" target={modelUrl} />
      <LinkCrumb text="Config Investigator" target={configUrl} />
      <TextCrumb text={urlParams.monitorId} />
    </Breadcrumbs>
  );
}

function SegmentOutputBreadCrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <SegmentListingLinkCrumb urlParams={urlParams} />
      <SegmentCrumb urlParams={urlParams} />
      <SegmentOutputBreadCrumb link urlParams={urlParams} />
      <TextCrumb text={urlParams.outputName} />
    </Breadcrumbs>
  );
}

function SegmentOutputListBreadCrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <SegmentListingLinkCrumb urlParams={urlParams} />
      <SegmentCrumb urlParams={urlParams} />
      <TextCrumb text="Outputs" />
    </Breadcrumbs>
  );
}

function ResourceDashboardsBreadCrumbs({
  urlParams,
  tabTitle,
  isSegmentView,
}: CommonCrumbProps & { tabTitle: string; isSegmentView?: boolean }) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      {isSegmentView && <SegmentListingLinkCrumb urlParams={urlParams} />}
      {isSegmentView && <SegmentCrumb urlParams={urlParams} />}
      <TextCrumb text="Dashboards" />
      <TextCrumb text={tabTitle} />
    </Breadcrumbs>
  );
}

function OutputListBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb urlParams={urlParams} link />
      <TextCrumb text="Outputs" />
    </Breadcrumbs>
  );
}

function ResourceSummaryBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <TextCrumb text="Summary" />
    </Breadcrumbs>
  );
}

function ModelOutputBreadcrumbs({ urlParams }: CommonCrumbProps) {
  const { classes: styles } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const outputsLink = getNavUrl({ modelId: urlParams.modelId, page: 'output' });
  return (
    <Breadcrumbs classes={{ separator: styles.breadcrumb }} aria-label="breadcrumb">
      <HomeCrumb />
      <ResourceCrumb link urlParams={urlParams} />
      <LinkCrumb text="Outputs" target={outputsLink} />
      <TextCrumb text={urlParams.outputName} />
    </Breadcrumbs>
  );
}

const Breadcrumb: React.FC = () => {
  const pt = usePageTypeWithParams();
  switch (pt.pageType) {
    case 'notFound':
      return <></>;
    case 'globalSettings':
      return <div />;
    case 'segmentListing':
      return <SegmentListingBreadcrumbs urlParams={pt} />;
    case 'segment':
      return <SegmentColumnListBreadcrumbs urlParams={pt} />;
    case 'features':
      return <ResourceColumnListHomeBreadcrumbs urlParams={pt} />;
    case 'executive':
    case 'modelsSummary':
      return <ModelsDashboardBreadcrumbs />;
    case 'datasetsSummary':
      return <DatasetsDashboardBreadcrumbs />;
    case 'customDashboards':
      return <MyDashboardBreadcrumbs />;
    case 'dashboard':
      return <DashboardBreadcrumbs />;
    case 'accessToken':
      return <KeysBreadcrumbs />;
    case 'notifications':
      return <NotificationsBreadcrumbs />;
    case 'notificationAction':
      return <NotificationActionBreadcrumbs urlParams={pt} />;
    case 'modelSettings':
      return <ResourceSettingsBreadcrumbs />;
    case 'integrationSettings':
      return <IntegrationsSettingsBreadcrumbs />;
    case 'userSettings':
      return <UserSettingsBreadcrumbs />;
    case 'dataProfile':
      return <ProfileBreadcrumbs urlParams={pt} />;
    case 'feature':
      return <ResourceColumnBreadcrumbs urlParams={pt} />;
    case 'explainability':
      return <ResourceDashboardsBreadCrumbs urlParams={pt} tabTitle="Explainability" />;
    case 'llmDashboards':
    case 'llmSecurityDashboard':
    case 'llmPerformanceDashboard':
    case 'llmCustomDashboard':
    case 'llmSegmentAnalysisDashboard':
    case 'segmentLlmDashboards':
    case 'segmentLlmSecurityDashboard':
    case 'segmentLlmPerformanceDashboard':
    case 'segmentLlmCohortsDashboard':
    case 'segmentLlmCustomDashboard':
      return <LLMDashboardsBreadcrumbs urlParams={pt} />;
    case 'monitorManager':
      return <ResourceMonitorManagerBreadcrumbs urlParams={pt} />;
    case 'monitorManagerMonitorRuns':
      return <ResourceMonitorManagerSubTabBreadcrumbs urlParams={pt} subTabHeading="Monitor Runs" />;
    case 'monitorManagerPresets':
      return <ResourceMonitorManagerSubTabBreadcrumbs urlParams={pt} subTabHeading="Presets" />;
    case 'monitorManagerConfigInvestigator':
      return <ResourceMonitorManagerSubTabBreadcrumbs urlParams={pt} subTabHeading="Config Investigator" />;
    case 'monitorManagerCustomConfigInvestigator':
      return <ResourceMonitorManagerCustomConfig urlParams={pt} />;
    case 'monitorManagerCustomize':
      return <ResourceMonitorManagerSubTabBreadcrumbs urlParams={pt} subTabHeading="New monitor" />;
    case 'monitorManagerCustomizeJsonPreset':
    case 'monitorManagerCustomizeJson':
      return <ResourceMonitorManagerJsonEditorBreadcrumbs urlParams={pt} />;
    case 'monitorManagerCustomizeExisting':
      return <ResourceMonitorManagerSubTabBreadcrumbs urlParams={pt} subTabHeading="Edit monitor" />;
    case 'monitorManagerAnomaliesFeed':
      return <ResourceMonitorManagerSubTabBreadcrumbs urlParams={pt} subTabHeading="Anomalies Feed" />;
    case 'output':
      return <OutputListBreadcrumbs urlParams={pt} />;
    case 'resource':
    case 'summary':
      return <ResourceSummaryBreadcrumbs urlParams={pt} />;
    case 'performance':
      return <ResourceDashboardsBreadCrumbs urlParams={pt} tabTitle="Performance" />;
    case 'constraints':
      return <ResourceDashboardsBreadCrumbs urlParams={pt} tabTitle="Constraints" />;
    case 'segmentConstraints':
      return <ResourceDashboardsBreadCrumbs urlParams={pt} tabTitle="Constraints" isSegmentView />;
    case 'segmentDataProfile':
      return <SegmentProfileBreadcrumbs urlParams={pt} />;
    case 'segmentFeature':
      return <SegmentColumnBreadcrumbs urlParams={pt} />;
    case 'segmentOutput':
      return <SegmentOutputListBreadCrumbs urlParams={pt} />;
    case 'segmentPerformance':
      return <ResourceDashboardsBreadCrumbs urlParams={pt} tabTitle="Performance" isSegmentView />;
    case 'outputFeature':
      return <ModelOutputBreadcrumbs urlParams={pt} />;
    case 'segmentOutputFeature':
      return <SegmentOutputBreadCrumbs urlParams={pt} />;
    case 'segmentAnalysis':
      return <ResourceDashboardsBreadCrumbs urlParams={pt} tabTitle="Segment Analysis" />;
    case 'resourceCustomDashboard':
    case 'segmentResourceCustomDashboard':
      return <ResourceDashboardsBreadCrumbs urlParams={pt} tabTitle="Custom" />;
  }

  return <></>;
};

export default Breadcrumb;
