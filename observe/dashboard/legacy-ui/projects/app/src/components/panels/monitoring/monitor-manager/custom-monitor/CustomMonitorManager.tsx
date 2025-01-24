import { useState, useEffect, FormEvent } from 'react';
import { useRecoilState } from 'recoil';
import { Link } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { IconX, IconPencil } from '@tabler/icons';
import { Analyzer, Monitor } from 'generated/monitor-schema';
import { TimePeriod, useGetBatchFrequencyQuery, useGetIoFeaturesQuery } from 'generated/graphql';
import { useCustomMonitor } from 'hooks/useCustomMonitor';
import { timePeriodToGranularity } from 'adapters/monitor-adapters';
import useTypographyStyles from 'styles/Typography';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import {
  WhyLabsActionIcon,
  WhyLabsButton,
  WhyLabsText,
  WhyLabsTextInput,
  WhyLabsTypography,
} from 'components/design-system';
import { Drawer, Loader, ScrollArea } from '@mantine/core';
import ReactJson from 'react-json-view';
import { useDisclosure } from '@mantine/hooks';
import { Colors } from '@whylabs/observatory-lib';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { useUserContext } from 'hooks/useUserContext';
import { canManageMonitors } from 'utils/permissionUtils';
import { tooltips } from 'strings/tooltips';
import useCustomMonitorManagerCSS from './useCustomMonitorManagerCSS';
import { PhaseOption, PhaseOptions, phasesComponents } from './CustomMonitorPhases';
import useMonitorSchema from '../hooks/useMonitorSchema';
import PhaseTitleComponent from './PhaseTitleComponent';
import CardWrapper from './CardWrapper';
import { CLASSIFICATION_PRESETS } from '../constants/ui-builder-presets/classificationPresets';
import { DRIFT_PRESETS } from '../constants/ui-builder-presets/driftPresets';
import { DATA_QUALITY_PRESETS } from '../constants/ui-builder-presets/dataQualityPresets';

const phasesArr = Object.values(phasesComponents);
// change to true to be able to see the monitor atom on UI
export const DEBUG_MODE = false;
export default function CustomMonitorManager(): JSX.Element {
  const [jsonMonitorAtom, { close: closeMonitorJson, open: openMonitorJson }] = useDisclosure(false);
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const { modelId, passedId } = usePageTypeWithParams();
  useSetHtmlTitle(passedId ? 'Edit monitor' : 'New monitor');
  const [config, setRecoilState] = useRecoilState(customMonitorAtom);
  const { monitorDisplayName, useCase, modelPerformanceConfig, metric } = config;
  const { setMonitorState, resetMonitorState, generateNewMonitorId, getNewMonitorAndAnalyzer, setMonitorDisplayName } =
    useCustomMonitor();
  const [activePhaseIndex, setActivePhaseIndex] = useState<number[]>([0]);
  const { getNavUrl, handleNavigation } = useNavLinkHandler();
  const { monitorSchema, updateMonitorAndAnalyzer } = useMonitorSchema({ modelId });
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [invalidUrlId, setInvalidUrlId] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [[editedAnalyzer, editedMonitor], setEditedPair] = useState<[Analyzer | undefined, Monitor | undefined]>([
    undefined,
    undefined,
  ]);
  const {
    data: featuresQueryData,
    loading: featuresQueryLoading,
    error: featuresQueryError,
  } = useGetIoFeaturesQuery({
    variables: { modelId },
  });
  const { classes: typography } = useTypographyStyles();
  const { data: batchFrequency } = useGetBatchFrequencyQuery({ variables: { modelId } });

  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const userCanManageMonitors = canManageMonitors(user);

  useEffect(() => {
    if (passedId) {
      setEditMode(true);
      setActivePhaseIndex([]);
    }
  }, [passedId]);

  useEffect(
    () =>
      setRecoilState((prevState) => ({
        ...prevState,
        featuresQueryData,
        granularity: timePeriodToGranularity(batchFrequency?.model?.batchFrequency ?? TimePeriod.P1D),
      })),
    [featuresQueryData, batchFrequency, setRecoilState],
  );

  useEffect(() => {
    // hook called on load page
    if (passedId) {
      if (monitorSchema) {
        const monitor = monitorSchema.monitors.find((m) => m.id === passedId);
        let analyzer: Analyzer | undefined;

        if (monitor && monitor.analyzerIds.length) {
          // editing existing monitor
          analyzer = monitorSchema.analyzers.find((a) => a.id === monitor.analyzerIds[0]);
          if (!analyzer) {
            console.error(`Monitor ${monitor.id} does not have an analyzer include in the current schema.`);
          }
          setEditedPair([analyzer, monitor]);
        } else {
          // creating new monitor from presets
          const getAnalyzer = (analyzers: Analyzer[], analyzerId: string) => analyzers.find((a) => a.id === analyzerId);
          analyzer =
            getAnalyzer(
              CLASSIFICATION_PRESETS.map((preset) => preset.analyzer),
              passedId,
            ) ||
            getAnalyzer(
              DRIFT_PRESETS.map((preset) => preset.analyzer),
              passedId,
            ) ||
            getAnalyzer(
              DATA_QUALITY_PRESETS.map((preset) => preset.analyzer),
              passedId,
            );
        }

        if (analyzer) {
          resetMonitorState();
          setMonitorState(analyzer, monitor);
          setMonitorDisplayName(monitor?.displayName ?? passedId);
          setLoading(false);
        } else {
          // If we couldn't find the analyzer, that means that the passed ID is invalid.
          setLoading(false);
          setInvalidUrlId(true);
        }
      }
    } else {
      resetMonitorState();
      generateNewMonitorId();
      setLoading(false);
    }
  }, [passedId, monitorSchema, setMonitorState, setMonitorDisplayName, generateNewMonitorId, resetMonitorState]);

  const onEditPhase = (phaseIndex: number) => {
    setActivePhaseIndex((prevState) => {
      if (prevState.includes(phaseIndex) && editMode) {
        return prevState.filter((x) => x !== phaseIndex);
      }
      return editMode ? [...prevState, phaseIndex] : [phaseIndex];
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // const fromData = new FormData(e.target as HTMLFormElement);
    if (phasesArr.length - 1 === activePhaseIndex[activePhaseIndex.length - 1] || editMode) {
      // SAVE on submit
      updateMonitorAndAnalyzer(getNewMonitorAndAnalyzer(editedAnalyzer, editedMonitor))
        ?.then(() => {
          enqueueSnackbar({ title: editMode ? 'Successfully updated monitor' : 'Successfully added monitor' });
          handleNavigation({ page: 'monitorManager', modelId });
        })
        .catch((err) => {
          enqueueErrorSnackbar({ explanation: 'Failed to save monitor', err });
        });
    } else {
      // NEXT on submit
      setActivePhaseIndex((prevState) => [prevState[0] + 1]);
    }
  };

  function getPhaseOption(options: PhaseOption[], currentPhase: number): PhaseOption | undefined {
    if (currentPhase === 3) {
      switch (modelPerformanceConfig) {
        case 'static threshold':
          return options.find((option) => option.id === PhaseOptions.StaticThreshold);
        default:
          return options.find((option) => option.id === PhaseOptions.Default);
      }
    }
    if (currentPhase === 1) {
      if (
        useCase !== 'Data quality' &&
        ['inferred_data_type', 'count_null', 'count_null_ratio', 'unique_est', 'unique_est_ratio'].includes(metric)
      ) {
        setRecoilState((prev) => ({
          ...prev,
          useCase: 'Data quality',
        }));
      }
      return options.find((option) => {
        return useCase === 'Data quality' ? option.id === PhaseOptions.DataQuality : option.id === PhaseOptions.Default;
      });
    }

    // Default way we determine which options to pick
    return options.length === 1 ? options[0] : options.find((o) => o?.id === useCase);
  }

  if (featuresQueryError) {
    console.error(
      `An error occurred while fetching features in 'CustomMonitorManager' component: ${featuresQueryError.message}`,
    );
  }

  if (loading || featuresQueryLoading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader size={50} />
      </div>
    );
  }

  if (invalidUrlId) {
    return (
      <div className={styles.loaderWrap}>
        <WhyLabsText>
          <span>It looks like the monitor you are trying to edit, with ID</span>{' '}
          <span style={{ fontFamily: 'Inconsolata', fontWeight: 600 }}>{passedId}</span>
          <span>, does not have a valid configuration.</span>
          <br />
          <span>The list of available monitors can be found in the</span>{' '}
          <Link to={getNavUrl({ page: 'monitorManager', modelId })}>Monitor Manager</Link>
        </WhyLabsText>
      </div>
    );
  }

  return (
    <div className={styles.pageRoot}>
      {DEBUG_MODE && (
        <Drawer
          withinPortal
          opened={jsonMonitorAtom}
          onClose={closeMonitorJson}
          size="600px"
          padding="lg"
          position="right"
          title={<WhyLabsTypography order={5}>Monitor Atom State</WhyLabsTypography>}
        >
          <ScrollArea h={window.innerHeight - 100} type="always">
            <ReactJson displayDataTypes={false} displayObjectSize={false} src={config} />
          </ScrollArea>
        </Drawer>
      )}
      <form
        onSubmit={onSubmit}
        className={styles.phasesContainer}
        onChange={() => {
          setHasChanged(true);
        }}
      >
        {DEBUG_MODE && (
          <div className={styles.debugButton}>
            <WhyLabsButton variant="filled" color="primary" onClick={openMonitorJson}>
              Open JSON state
            </WhyLabsButton>
          </div>
        )}
        <div className={styles.phaseRow}>
          <h1 className={cx(styles.pageTitleLeft, styles.pageTitle)}>{editMode ? 'Edit' : 'New'} monitor:</h1>
          <div className={styles.monitorInputWrapper}>
            <WhyLabsTextInput
              id="monitorDisplayName"
              minLength={10}
              maxLength={256}
              value={monitorDisplayName}
              onChange={(value) => setMonitorDisplayName(value)}
              label=""
              size="lg"
            />
            <div className={styles.monitorIdWrapper}>
              <span className={cx(styles.monitorIdText, typography.helperTextThin)}>Monitor ID: </span>
              <span className={cx(styles.monitorIdText, styles.monitorIdTextBold, typography.helperTextThin)}>
                {config.monitorId}
              </span>
            </div>
          </div>
        </div>
        {phasesArr.map((phase, phaseIndex) => {
          const currentPhase = phaseIndex + 1;
          const isLastPhase = phasesArr.length - 1 === phaseIndex;
          const isPhaseComplete = activePhaseIndex[0] > phaseIndex;
          const { phaseTitle, options } = phase;
          const selectedOption = getPhaseOption(options, currentPhase);
          const cards = selectedOption?.cards || [];
          const showEditBtn = editMode ? true : isPhaseComplete;
          return (
            <div className={styles.phaseRow} key={`phase-row-${phaseTitle}`}>
              <PhaseTitleComponent
                phaseIndex={phaseIndex}
                activePhaseIndex={activePhaseIndex}
                isLastPhase={isLastPhase}
                phaseTitle={phaseTitle}
                editMode={editMode}
              />
              {cards.map((card, cardIndex) => {
                let btnComponent;
                const displaySaveButton = isLastPhase || editMode;
                if (cardIndex === 0 && !editMode) {
                  btnComponent = (
                    <WhyLabsButton
                      size="xs"
                      disabled={!userCanManageMonitors && displaySaveButton}
                      disabledTooltip={tooltips.hasNoPermissionToCreateMonitor}
                      type="submit"
                      className={styles.nextBtn}
                      variant="filled"
                    >
                      {displaySaveButton ? 'Save' : 'Next'}
                    </WhyLabsButton>
                  );
                }

                return (
                  <CardWrapper
                    // eslint-disable-next-line react/no-array-index-key
                    key={`phase-row-${phaseTitle}-card-${cardIndex}-${card.id}`}
                    phaseIndex={phaseIndex}
                    activePhaseIndex={activePhaseIndex}
                    cardComponent={card}
                    isLastCardInRow={cards.length - 1 === cardIndex}
                    isFirstCardInRow={cardIndex === 0}
                    btnComponent={btnComponent}
                    editMode={editMode}
                    setHasChanged={setHasChanged}
                  />
                );
              })}
              {showEditBtn && (
                <WhyLabsActionIcon
                  className={styles.phaseEditBtn}
                  label="edit section"
                  onClick={() => onEditPhase(phaseIndex)}
                  color={Colors.brandPrimary700}
                >
                  {activePhaseIndex.includes(phaseIndex) ? <IconX /> : <IconPencil />}
                </WhyLabsActionIcon>
              )}
            </div>
          );
        })}
        {editMode && (
          <div className={styles.phaseRow}>
            <div className={styles.actionControls}>
              <WhyLabsButton type="submit" size="xs" className={styles.nextBtn} disabled={!hasChanged} variant="filled">
                Save
              </WhyLabsButton>
              <WhyLabsButton
                className={cx(styles.actionButton)}
                variant="outline"
                color="gray"
                size="xs"
                onClick={() => {
                  handleNavigation({ page: 'monitorManager', modelId });
                }}
              >
                Cancel
              </WhyLabsButton>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
