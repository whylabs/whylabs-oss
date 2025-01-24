import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import MonitorManagerCard from 'components/monitor-manager-card/MonitorManagerCard';
import { createStyles, Skeleton } from '@mantine/core';
import { Analyzer, FixedCadenceSchedule, Monitor } from 'generated/monitor-schema';
import { createDefaultPresetMonitor } from 'adapters/monitor-adapters';
import { MonitorSchema } from 'monitor-schema-types';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';
import WhyDogIdle from 'components/animated-components/whydog/WhyDogIdle';
import DogDialogQuestionMark from 'components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import {
  AssetCategory,
  ModelType,
  TimePeriod,
  useGetModelAvailablePerformanceMetricsQuery,
  useGetNotificationActionsQuery,
  useGetNotificationIdsQuery,
} from 'generated/graphql';
import { cloneDeep } from '@apollo/client/utilities';
import { useRecoilState } from 'recoil';
import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import { Colors } from '@whylabs/observatory-lib';
import { getRandomizedCharName } from 'utils/nameUtils';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { arrayOfLength } from 'utils/arrayUtils';
import deepCopy from 'lodash/cloneDeep';
import { WhyLabsLoadingOverlay, WhyLabsText } from 'components/design-system';
import { getAnalyzerMetric } from 'hooks/useCustomMonitor/monitorUtils';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import {
  CustomJsonPresetCard,
  CustomJsonPresetItem,
  defaultTrailingWindowBaselineSize,
  MonitorItem,
} from '../constants/presetUtils';
import useMonitorSchema from '../hooks/useMonitorSchema';
import { isWhiteList } from '../utils/mv3Utils';
import { batchFrequencyToCadence } from '../utils/batchFrequencyToCadence';
import { REGRESSION_PRESETS } from '../constants/ui-builder-presets/regressionPresets';
import { CLASSIFICATION_PRESETS } from '../constants/ui-builder-presets/classificationPresets';
import { DRIFT_PRESETS } from '../constants/ui-builder-presets/driftPresets';
import { DATA_QUALITY_PRESETS } from '../constants/ui-builder-presets/dataQualityPresets';
import { DQ_CUSTOM_JSON_PRESETS } from '../constants/json-editor-presets/dataQualityJsonPresets';
import { INTEGRATION_CUSTOM_JSON_PRESETS } from '../constants/json-editor-presets/integrationJsonPresets';
import { LLM_SECURITY_CUSTOM_JSON_PRESETS } from '../constants/json-editor-presets/llmSecurityJsonPresets';
import { LLM_QUALITY_CUSTOM_JSON_PRESETS } from '../constants/json-editor-presets/llmQualityJsonPresets';
import { LLM_SENTIMENT_CUSTOM_JSON_PRESETS } from '../constants/json-editor-presets/llmSentimentJsonPresets';

const useStyles = createStyles({
  cardsSection: {
    margin: '40px 0 40px 0',
  },
  cardsContainer: {
    marginBottom: '20px',
    gap: '20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(254px, 254px))',
  },
  firstSentance: {
    display: 'block',
  },
  secondSentance: {
    display: 'block',
  },
  block: {
    position: 'absolute',
    zIndex: 100,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  title: {
    fontSize: '42px',
    lineHeight: '63px',
    fontWeight: 400,
  },
  subtitle: {
    fontSize: '22px',
    lineHeight: '33px',
    marginBottom: '40px',
  },
  text: {
    fontFamily: 'Asap',
    color: Colors.secondaryLight1000,
  },
  categoryTitle: {
    fontWeight: 600,
    marginBottom: '15px',
    fontSize: '16px',
    lineHeight: '24px',
  },
  root: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
});

interface PresetsCardViewProps {
  isFirstLoad: boolean;
  setIsFirstLoad: Dispatch<SetStateAction<boolean>>;
  userCanManageMonitors: boolean;
}

export function PresetsCardView({
  isFirstLoad,
  setIsFirstLoad,
  userCanManageMonitors,
}: PresetsCardViewProps): JSX.Element {
  useSetHtmlTitle('Monitor presets');

  const { classes: styles, cx } = useStyles();
  const {
    resourceId,
    resourceState: { resource },
    loading: resourceInfoLoading,
  } = useResourceContext();

  const resourceCategory = resource?.category ?? AssetCategory.Model;
  const displayLLMMonitors = resourceCategory === AssetCategory.Llm;
  const isModelCategory = [AssetCategory.Model, AssetCategory.Llm].includes(resourceCategory);
  const resourceType = resource?.type;
  const performancePresets = resourceType === ModelType.Classification ? CLASSIFICATION_PRESETS : REGRESSION_PRESETS;

  const { handleNavigation } = useNavLinkHandler();
  const { monitorSchema, updateMonitorAndAnalyzer, queryLoading, error, refetchSchema } = useMonitorSchema({
    modelId: resourceId,
  });
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [blockUI, setBlockUI] = useState(false);
  const {
    data: notificationData,
    loading: notificationsLoading,
    error: notificationsError,
  } = useGetNotificationIdsQuery();
  const {
    data: notificationOptions,
    loading: notificationOptionsLoading,
    error: notificationOptionsError,
  } = useGetNotificationActionsQuery();
  const { data: checkData } = useGetModelAvailablePerformanceMetricsQuery({ variables: { datasetId: resourceId } });
  const notifications = useMemo(() => notificationData?.user.organization?.notifications, [notificationData]);
  const [isEmptyMonitor] = useRecoilState(emptyMonitorAtom);

  const loading = useMemo(() => {
    if (queryLoading || notificationsLoading || notificationOptionsLoading || resourceInfoLoading) return true;

    return false;
  }, [queryLoading, notificationsLoading, notificationOptionsLoading, resourceInfoLoading]);

  const getUniqueId = useCallback(
    (id: string) => {
      const existingIds = monitorSchema?.analyzers?.map((a) => a.id ?? '') ?? [];
      return getRandomizedCharName(id, existingIds);
    },
    [monitorSchema],
  );

  const createMonitorAndAnalyzerFromTemplate = useCallback(
    (preset: MonitorItem, id: string, batchFrequency?: TimePeriod) => {
      const uniqueId = getUniqueId(id);
      const newMonitor = createDefaultPresetMonitor(
        uniqueId,
        uniqueId.replace('analyzer', 'monitor'),
        notificationOptions?.user.organization?.notifications?.slack?.general.enabled ?? false,
        notificationOptions?.user.organization?.notifications?.email?.general.enabled ?? false,
        notifications?.email?.general.id,
        notifications?.slack?.general.id,
      );
      const analyzerCadence: FixedCadenceSchedule = {
        type: 'fixed',
        cadence: batchFrequencyToCadence(batchFrequency),
      };
      const analyzer = {
        ...cloneDeep(preset.analyzer),
        schedule: analyzerCadence,
      };
      analyzer.id = uniqueId;
      return [newMonitor, analyzer] as const;
    },
    [getUniqueId, notificationOptions, notifications],
  );

  useEffect(() => {
    if (isEmptyMonitor && isFirstLoad) localStorage.setItem('IS_MM_BANNER_CLOSED', 'false');
    setIsFirstLoad(false);
  }, [isEmptyMonitor, setIsFirstLoad, isFirstLoad]);

  async function enableMonitor(
    schema: MonitorSchema | undefined,
    monitor: Monitor,
    analyzer: Analyzer,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    suppressSuccess = false,
  ) {
    if (!schema) {
      setLoading(false);
      setBlockUI(false);
      console.error('Attempting to add preset monitors to an undefined schema.');
      return;
    }

    setBlockUI(true);
    try {
      await updateMonitorAndAnalyzer({ monitor, analyzer });
      if (!suppressSuccess) {
        enqueueSnackbar({ title: `Successfully added ${monitor.displayName ?? ''}` });
      }
    } catch (err) {
      console.log(
        `Error adding monitor preset: Monitor ${JSON.stringify(monitor)} --- Analyzer ${JSON.stringify(
          analyzer,
        )} --- Schema ${schema} -- error ${err}`,
      );
      enqueueErrorSnackbar({ explanation: 'Error adding monitor preset', err });
    }
    await refetchSchema();
    setLoading(false);
    setBlockUI(false);
  }

  if (error || notificationsError || notificationOptionsError) {
    console.log('Failed to fetch monitor schema');
    return (
      <AttentionPageWrap
        title="Whoops"
        subtitle="Something went wrong, please reload the page or contact whylabs support"
        dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
      />
    );
  }

  const handlePreset = (preset: MonitorItem): MonitorItem => {
    const { analyzer } = deepCopy(preset);
    if ('baseline' in analyzer.config && analyzer.config.baseline?.type === 'TrailingWindow') {
      const { batchFrequency } = resource ?? {};
      const baseline = batchFrequency && defaultTrailingWindowBaselineSize.get(batchFrequency);
      analyzer.config.baseline = { type: 'TrailingWindow', size: Number(baseline?.size ?? 7) };
    }
    return { ...preset, analyzer };
  };

  const handleMonitorActivation = async (
    setLoading: Dispatch<SetStateAction<boolean>>,
    preset: MonitorItem,
    id: string,
    avoidSuccessMessage = false,
  ) => {
    const [newMonitor, newAnalyzer] = createMonitorAndAnalyzerFromTemplate(
      handlePreset(preset),
      id,
      resource?.batchFrequency,
    );
    setLoading(true);
    try {
      await enableMonitor(monitorSchema, newMonitor, newAnalyzer, setLoading, avoidSuccessMessage);
      return newMonitor.id;
    } catch (err) {
      console.error('failure to create a template from a preset', err);
      enqueueErrorSnackbar({ explanation: 'Error configuring from monitor preset', err });
      setLoading(false);
    }
    return '';
  };
  const navigateEditMonitor = (id: string) =>
    handleNavigation({
      page: 'monitorManager',
      modelId: resourceId,
      monitorManager: { path: 'customize-ui', id },
    });

  const renderCustomJsonSection = (sectionTitle: string, presets: CustomJsonPresetItem[]) => {
    return (
      <div className={styles.cardsSection}>
        <WhyLabsText inherit className={cx(styles.text, styles.categoryTitle)}>
          {sectionTitle}
        </WhyLabsText>
        <div className={styles.cardsContainer}>
          {presets.map((preset) => {
            return (
              <CustomJsonPresetCard
                userCanManageMonitors={userCanManageMonitors}
                category={resourceCategory}
                key={preset.presetId}
                preset={preset}
                resourceId={resourceId}
                loading={resourceInfoLoading}
                batchFrequency={resource?.batchFrequency}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderUiBuilderSection = (
    sectionTitle: string,
    presets: MonitorItem[],
    noPerformanceMetrics = false,
    children?: JSX.Element,
  ) => (
    <div className={styles.cardsSection}>
      <WhyLabsText inherit className={cx(styles.text, styles.categoryTitle)}>
        {sectionTitle}
      </WhyLabsText>
      <div className={styles.cardsContainer}>
        {presets.map((preset) => {
          if (preset.hideOnCustomJsonFlag) return null;
          const { id } = preset.analyzer;
          if (!id) {
            console.log('Could not create monitor because analyzer id is missing');
          }
          if (!preset.title || !preset.description || !id) return null; // Do not return a card if there's no info
          if (loading) return <Skeleton key={id} height="185px" width="254px" style={{ transform: 'unset' }} />;

          return (
            <MonitorManagerCard
              userCanManageMonitors={userCanManageMonitors}
              key={id}
              id={id}
              disableControls={preset.disable}
              icon={preset.icon}
              color={preset.color}
              categoryTitle={preset.categoryTitle(resourceCategory)}
              title={preset.title(resourceCategory)}
              text={preset.description(resourceCategory, resource?.batchFrequency)}
              onConfigureClick={async (setLoading) => {
                const newMonitorId = await handleMonitorActivation(setLoading, preset, id, true);
                if (newMonitorId) {
                  navigateEditMonitor(newMonitorId);
                }
              }}
              disableConfigure={!isWhiteList(getAnalyzerMetric(preset.analyzer.config))}
              onEnableClick={(setLoading) => {
                handleMonitorActivation(setLoading, preset, id);
              }}
              noPerformance={noPerformanceMetrics}
            />
          );
        })}
      </div>
      {children}
    </div>
  );

  const renderFirstSection = () => {
    if (displayLLMMonitors) {
      return renderCustomJsonSection('Security', LLM_SECURITY_CUSTOM_JSON_PRESETS);
    }
    return renderUiBuilderSection('Drift', DRIFT_PRESETS);
  };

  const renderSecondSection = () => {
    if (displayLLMMonitors) {
      return renderCustomJsonSection('Quality', LLM_QUALITY_CUSTOM_JSON_PRESETS);
    }
    const dqJsonPresets = (
      <>
        {arrayOfLength(4).map((index) => {
          const rowNumber = index + 1;
          if (rowNumber === 1) return null;
          return (
            <div className={styles.cardsContainer} key={rowNumber}>
              {DQ_CUSTOM_JSON_PRESETS.map((preset) => {
                if (preset.hideOnCustomJsonFlag) return null;
                if (preset.rowNumber && preset.rowNumber !== rowNumber) return null;
                return (
                  <CustomJsonPresetCard
                    userCanManageMonitors={userCanManageMonitors}
                    category={resourceCategory}
                    key={preset.presetId}
                    preset={preset}
                    resourceId={resourceId}
                    loading={resourceInfoLoading}
                    batchFrequency={resource?.batchFrequency}
                  />
                );
              })}
            </div>
          );
        })}
      </>
    );
    return renderUiBuilderSection('Data quality', DATA_QUALITY_PRESETS, undefined, dqJsonPresets);
  };

  const renderThirdSection = () => {
    if (displayLLMMonitors) {
      return renderCustomJsonSection('Sentiment', LLM_SENTIMENT_CUSTOM_JSON_PRESETS);
    }
    if (resourceType === ModelType.Regression || resourceType === ModelType.Classification) {
      const noPerformanceMetrics = !checkData?.model?.datasetMetrics?.length;
      return renderUiBuilderSection('Model performance', performancePresets, noPerformanceMetrics);
    }
    return null;
  };

  const renderFourthSection = () => {
    return renderCustomJsonSection('Integration health', INTEGRATION_CUSTOM_JSON_PRESETS);
  };

  if (resourceInfoLoading) return <WhyLabsLoadingOverlay visible />;

  return (
    <div className={styles.root}>
      <div>
        {blockUI && <div className={styles.block} />}
        <WhyLabsText inherit className={cx(styles.title, styles.text)}>
          Preset monitors
        </WhyLabsText>
        <WhyLabsText inherit className={cx(styles.subtitle, styles.text)}>
          Enable monitoring with one-click
        </WhyLabsText>
        {isModelCategory && renderFirstSection()}
        {renderSecondSection()}
        {renderThirdSection()}
        {renderFourthSection()}
      </div>
    </div>
  );
}
