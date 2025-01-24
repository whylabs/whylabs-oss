import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { AnalysisDataFragment } from 'generated/graphql';
import { Dispatch, SetStateAction, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useRecoilState } from 'recoil';
import { whyCardsAnalyzersAtom } from 'atoms/whyCardsAnalyzersAtom';
import { ACTION_STATE_TAG, SELECTED_TIMESTAMP } from 'types/navTags';
import { CardType } from 'components/cards/why-card/types';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { cardTypeToAnalysisMetrics, getDecorationTypeByMetric } from 'utils/analysisUtils';
import isEqual from 'lodash/isEqual';
import { MonitorDropdownComponent } from './MonitorDropdownComponent';
import { IMonitorDropdownList, mapAnalyzers } from './utils';

interface MonitorDropdownProps {
  analysisResults: AnalysisDataFragment[];
  setAnalyzer?: Dispatch<SetStateAction<string>>;
  analyzer?: string;
  column?: boolean;
  analyzerRecoilKey: `${string}--${CardType}`;
  isCorrelatedAnomalies?: boolean;
  showCreateMonitorButton?: boolean;
  showNotMonitoredWarning?: boolean;
  width?: number;
  cardType: CardType;
}

const notMonitoredIncompatible: CardType[] = ['output', 'loading'];

export default function MonitoringMonitorDropdown({
  analysisResults,
  analyzer,
  setAnalyzer,
  width,
  column,
  analyzerRecoilKey,
  isCorrelatedAnomalies = false,
  showCreateMonitorButton = true,
  showNotMonitoredWarning = true,
  cardType,
}: MonitorDropdownProps): JSX.Element {
  const [, cardStateDispatch] = useContext(WhyCardContext);
  const [{ monitorSchema }] = useContext(AnalysisContext);

  const [analyzerRecoilState, setAnalyzerRecoilState] = useRecoilState(whyCardsAnalyzersAtom);
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { modelId } = usePageTypeWithParams();
  const { getAnalysisState } = useStateUrlEncoder();

  const analyzers: IMonitorDropdownList[] = useMemo(
    () => mapAnalyzers(modelId, analysisResults, monitorSchema?.monitors),
    [analysisResults, modelId, monitorSchema?.monitors],
  );
  const [prevItemsList, setPrevItemsList] = useState(analyzers);

  const emitSelectedAnalyzer = useCallback(
    (newAnalyzer?: IMonitorDropdownList, updateRecoil = false) => {
      const { analyzerId, monitorId } = newAnalyzer ?? {};
      if (!analyzerId) return;
      setAnalyzer?.(analyzerId);
      cardStateDispatch({ analyzer: analyzerId, monitorId });
      if (updateRecoil && newAnalyzer?.analyzerId) {
        setAnalyzerRecoilState((state) => {
          return { ...state, [analyzerRecoilKey]: newAnalyzer.analyzerId! };
        });
      }
    },
    [analyzerRecoilKey, setAnalyzer, setAnalyzerRecoilState, cardStateDispatch],
  );

  const findSelectedProfileAnomalousAnalyzer = (): IMonitorDropdownList | undefined => {
    const selectedProfile = getParam(SELECTED_TIMESTAMP);
    if (!selectedProfile || !activeCorrelatedAnomalies?.referenceFeature) return undefined;
    const selectedProfileAnomaly = analysisResults.find(
      ({ analyzerId, isAnomaly, datasetTimestamp }) =>
        isAnomaly && analyzerId && datasetTimestamp === Number(selectedProfile ?? 0),
    );
    return analyzers.find(({ analyzerId }) => analyzerId === selectedProfileAnomaly?.analyzerId);
  };

  const findUrlActionStateAnalyzer = (): IMonitorDropdownList | undefined => {
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    const targetId = actionState?.analyzerId;
    return analyzers.find(({ analyzerId }) => analyzerId === targetId);
  };

  const findRecoilActiveAnalyzer = (): IMonitorDropdownList | undefined => {
    if (isCorrelatedAnomalies) return undefined;
    const recoilAnalyzerId = analyzerRecoilState[analyzerRecoilKey];
    return analyzers.find(({ analyzerId }) => analyzerId === recoilAnalyzerId);
  };

  const findFirstAnomaly = (): AnalysisDataFragment | undefined => {
    const metrics = cardTypeToAnalysisMetrics.get(cardType);
    const firstAnomalyFound = analysisResults.find(
      (ar) => ar.metric && ar.isAnomaly && !!ar.analyzerId && metrics?.includes(ar.metric),
    );
    if (firstAnomalyFound?.metric) {
      const newDecorationType = getDecorationTypeByMetric(firstAnomalyFound.metric);
      cardStateDispatch({ decorationType: newDecorationType });
    }
    return firstAnomalyFound;
  };

  const firstLoad = useRef(true);

  const getDefaultAnalyzer = (): IMonitorDropdownList | undefined => {
    const selectedProfileAnalyzer = findSelectedProfileAnomalousAnalyzer();
    if (selectedProfileAnalyzer) return selectedProfileAnalyzer;
    const targetSearchQueryAnalyzer = findUrlActionStateAnalyzer();
    if (targetSearchQueryAnalyzer && firstLoad.current) {
      firstLoad.current = false;
      return targetSearchQueryAnalyzer;
    }
    const recoilActiveAnalyzer = findRecoilActiveAnalyzer();
    if (recoilActiveAnalyzer) return recoilActiveAnalyzer;
    const firstAnomaly = findFirstAnomaly();
    return analyzers.find(({ analyzerId }) => analyzerId === firstAnomaly?.analyzerId) ?? analyzers[0];
  };

  /*
   * The recoil state will store the selected analyzerId. If user navigate into features
   * it will show the same analyzer by default if it's there. Also, will keep the selected analyzer
   * when the full page loads e.g. global date range changes
   */
  const loadDefaultSelectedMonitor = () => {
    const defaultAnalyzer = getDefaultAnalyzer();
    setPrevItemsList(analyzers);
    const updateRecoil = !isCorrelatedAnomalies && !analyzerRecoilState[analyzerRecoilKey];
    emitSelectedAnalyzer(defaultAnalyzer, updateRecoil);
  };

  if (!isEqual(prevItemsList, analyzers)) {
    setPrevItemsList(analyzers);
    loadDefaultSelectedMonitor();
  }

  return (
    <MonitorDropdownComponent
      width={width}
      analysisResults={analysisResults}
      onChange={(newAnalyzer) => {
        if (newAnalyzer) {
          const analyzerItem = analyzers.find(({ analyzerId }) => analyzerId === newAnalyzer) ?? {
            analyzerId: newAnalyzer,
          };
          emitSelectedAnalyzer(analyzerItem, !isCorrelatedAnomalies);
        }
      }}
      column={column}
      analyzer={analyzer}
      showCreateMonitorButton={showCreateMonitorButton}
      showNotMonitoredWarning={notMonitoredIncompatible.includes(cardType) ? false : showNotMonitoredWarning}
    />
  );
}
