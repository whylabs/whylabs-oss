import { useRef, useCallback, useContext, useMemo, useState } from 'react';
import { IconX } from '@tabler/icons';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { timeLong } from 'utils/dateUtils';
import LabelCheckbox from 'pages/settings-pages/notifications/components/LabelCheckbox';
import { AnalysisDataFragment } from 'generated/graphql';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsSelect, WhyLabsTypography } from 'components/design-system';
import { SelectItem } from '@mantine/core';
import { SELECTED_TIMESTAMP } from 'types/navTags';
import { useQueryParams } from 'utils/queryUtils';
import { useCorrelatedAnomaliesHandler } from 'hooks/useCorrelatedAnomaliesHandler';
import useCorrelatedAnomaliesCSS from './useCorrelatedAnomaliesCSS';
import { correlatedAnomaliesOptionMetrics, CorrelatedCards, CorrelatedCardTypes } from './correlatedAnomaliesUtils';

const clearOldData = {
  pipedAnomaliesByMetric: undefined,
  selectedCorrelatedTimestamp: undefined,
} as const;

function formatDataForSelect(analysis: AnalysisDataFragment[]): SelectItem[] {
  return analysis.map((result) => {
    return {
      label: timeLong(result.datasetTimestamp!),
      value: result.datasetTimestamp?.toString() ?? '',
    };
  });
}

export default function CorrelatedAnomaliesHeader(): JSX.Element {
  const { classes, cx } = useCorrelatedAnomaliesCSS();
  const firstLoad = useRef<boolean>(true);
  const [
    {
      cardsAnalysisResult,
      activeCorrelatedAnomalies,
      correlatedAnomaliesTypeFilterOption,
      selectedCorrelatedTimestamp,
      pipedAnomaliesByMetric,
    },
    analysisDispatch,
  ] = useContext(AnalysisContext);
  if (firstLoad.current) {
    analysisDispatch(clearOldData);
    firstLoad.current = false;
  }
  const { outputName } = usePageTypeWithParams();
  const [selectedOutput] = useState<string>(outputName);
  const { setQueryParam } = useQueryParams();
  const outputChanges = selectedOutput !== outputName;
  const cardType = activeCorrelatedAnomalies.interactionCardType;
  const filteredAnalysis = useMemo(() => {
    const anomalyTimestamps: AnalysisDataFragment[] = [];
    if (cardType) {
      cardsAnalysisResult[cardType]?.data.forEach((ar) => {
        if (!ar.datasetTimestamp || !ar.isAnomaly) return;
        if (!anomalyTimestamps.find(({ datasetTimestamp }) => datasetTimestamp === ar.datasetTimestamp)) {
          anomalyTimestamps.push(ar);
        }
      });
    }
    return anomalyTimestamps.sort((a1, a2) => a2.datasetTimestamp! - a1.datasetTimestamp!);
  }, [cardType, cardsAnalysisResult]);

  const { handleShowCorrelated } = useCorrelatedAnomaliesHandler();
  const hideCorrelatedAlerts = () => {
    handleShowCorrelated({
      ...clearOldData,
      activeCorrelatedAnomalies: undefined,
      correlatedAnomaliesTypeFilterOption: {},
    });
  };

  if (outputChanges) {
    hideCorrelatedAlerts();
  }

  const handleSelectedTimestamp = useCallback(
    (ts: number, setParam = true) => {
      analysisDispatch({ selectedCorrelatedTimestamp: ts });
      if (setParam) setQueryParam(SELECTED_TIMESTAMP, ts.toString());
    },
    [analysisDispatch, setQueryParam],
  );

  if (filteredAnalysis?.[0]?.datasetTimestamp && !selectedCorrelatedTimestamp) {
    const { datasetTimestamp } =
      filteredAnalysis.find(({ datasetTimestamp: ts }) => {
        return ts === Number(getParam(SELECTED_TIMESTAMP) ?? 0);
      }) ?? {};
    const { datasetTimestamp: fallbackTimestamp } = filteredAnalysis[0];
    const timestamp = datasetTimestamp ?? fallbackTimestamp;
    if (timestamp) handleSelectedTimestamp(timestamp, false);
  }

  const handleFilterOption = (option: CorrelatedCardTypes, show: boolean) => {
    if (CorrelatedCards.includes(option)) {
      const options = { ...correlatedAnomaliesTypeFilterOption };
      delete options[option];
      analysisDispatch({
        correlatedAnomaliesTypeFilterOption: {
          ...options,
          [option]: { checked: show, showFeaturesCount: 2 },
        },
      });
    }
  };

  const renderAwareSelectAutoComplete = useCallback(() => {
    if (selectedCorrelatedTimestamp) {
      return (
        <div className={classes.profilesSelect}>
          <WhyLabsSelect
            id="alertTimestampsSelectionInput"
            label="Select the anomaly timestamp"
            value={selectedCorrelatedTimestamp.toString()}
            data={formatDataForSelect(filteredAnalysis ?? [])}
            placeholder="There are no correlated anomalies"
            onChange={(newSelection) => {
              const newTimestampSelected = Number(newSelection) || filteredAnalysis[0].datasetTimestamp!;
              handleSelectedTimestamp(newTimestampSelected);
            }}
          />
        </div>
      );
    }
    return <></>;
  }, [selectedCorrelatedTimestamp, classes.profilesSelect, filteredAnalysis, handleSelectedTimestamp]);
  return (
    <div className={classes.headerWrap}>
      {pipedAnomaliesByMetric && !selectedCorrelatedTimestamp && (
        <WhyLabsTypography className={classes.headerNoAnomalies}>No timestamp selected.</WhyLabsTypography>
      )}
      {pipedAnomaliesByMetric && selectedCorrelatedTimestamp && (
        <>
          <div className={classes.headerRow}>
            <WhyLabsTypography className={classes.headerCorrelatedTitle}>
              Correlated anomalies for {activeCorrelatedAnomalies.referenceFeature}
              <HtmlTooltip tooltipContent="Anomalies that have some correlation with a chosen timestamp." />
            </WhyLabsTypography>
            <IconX className={classes.headerCloseButton} onClick={hideCorrelatedAlerts} />
          </div>

          <div className={cx(classes.headerRow2)}>
            <div className={cx(classes.headerInputWrap)}>{renderAwareSelectAutoComplete()}</div>

            <div className={classes.headerCheckboxInputWrap}>
              <WhyLabsTypography className={classes.headerColumnTitle}>Filter anomalies by type:</WhyLabsTypography>
              <div className={classes.headerCheckboxesWrap}>
                {[...correlatedAnomaliesOptionMetrics.entries()].map(([correlatedType, option]) => (
                  <LabelCheckbox
                    text={<WhyLabsTypography className={classes.headerCheckboxText}>{option.label}</WhyLabsTypography>}
                    onChange={(isChecked) => handleFilterOption(correlatedType, isChecked)}
                    checked={!!correlatedAnomaliesTypeFilterOption[correlatedType]?.checked}
                    hidePreview
                    key={`${correlatedType}--correlated-checkbox`}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
