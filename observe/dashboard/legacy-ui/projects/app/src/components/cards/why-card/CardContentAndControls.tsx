import { useContext } from 'react';
import { useResizeObserver } from '@mantine/hooks';
import SchemaGraphArea from 'components/visualizations/schema-chart/SchemaGraphArea';
import { OutputGraphArea, SegmentOutputGraphArea } from 'components/visualizations/simple-line-chart';
import ThresholdGraphArea from 'components/visualizations/threshold-line-chart/ThresholdGraphArea';
import UniquesGraphArea from 'components/visualizations/uniques-chart/UniquesGraphArea';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { AnalysisDataFragment } from 'generated/graphql';
import { DriftChartsCouple } from 'components/visualizations/drift-graphs/DriftChartsCouple';
import { CardType } from './types';
import useWhyCardStyles from './useWhyCardStyles';
import { WhyCardContext } from './WhyCardContext';
import { CardDataContext } from './CardDataContext';

const CardContentAndControls: React.FC<{
  cardType: CardType;
  manualColumnId?: string;
  isOutput?: boolean;
  isCorrelatedAnomalies?: boolean;
}> = ({ cardType, manualColumnId, isOutput = false, isCorrelatedAnomalies = false }) => {
  const { classes: styles, cx } = useWhyCardStyles();
  const pt = usePageTypeWithParams();
  const [{ cardsAnalysisResult }, analysisDispatch] = useContext(AnalysisContext);
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  const {
    cardDataState: { selectedProfile, comparisonGraphOpened },
    setOpened,
  } = useContext(CardDataContext);
  const [ref, { width }] = useResizeObserver<HTMLDivElement>();

  if (selectedProfile && !comparisonGraphOpened) {
    setOpened(true);
  }

  if (cardState.cardWidth !== width) {
    cardStateDispatch({ cardWidth: width });
  }

  const setAnalysisResults = (analysisResults: AnalysisDataFragment[]) => {
    if (cardState.analysisResults !== analysisResults) {
      cardStateDispatch({ analysisResults });
    }
    if (cardsAnalysisResult[cardType]?.data !== analysisResults && !isCorrelatedAnomalies) {
      analysisDispatch({
        cardsAnalysisResult: { [cardType]: { data: analysisResults } },
      });
    }
  };

  const props = {
    manualColumnId,
    setAnalysisResults,
    isCorrelatedAnomalies,
    isOutput,
  };

  const renderGraphArea = () => {
    switch (cardType) {
      case 'missingValues':
        return <ThresholdGraphArea {...props} />;
      case 'uniqueValues':
        return <UniquesGraphArea {...props} />;
      case 'schema':
        return <SchemaGraphArea {...props} />;
      case 'drift':
        return <DriftChartsCouple {...props} />;
      case 'output':
        if (pt && (pt.pageType === 'segment' || pt.pageType === 'segmentOutputFeature')) {
          return <SegmentOutputGraphArea />;
        }
        return <OutputGraphArea />;
      default:
        console.error(`Attempting to show unknown card type: ${cardType}`);
        return <div>Unknown graph type.</div>;
    }
  };

  return (
    <>
      <div ref={ref} className={cx(styles.cardGraphArea)}>
        {renderGraphArea()}
      </div>
    </>
  );
};
export default CardContentAndControls;
