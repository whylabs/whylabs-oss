import React, { ReactElement, ReactNode, useContext, useEffect, useRef } from 'react';
import { List } from '@material-ui/core';
import { WhyCard } from 'components/cards';
import CorrelatedAnomalies from 'components/cards/why-card/correlated-anomalies/CorrelatedAnomalies';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import { useRecoilState, useResetRecoilState } from 'recoil';
import { whyCardsAnalyzersAtom } from 'atoms/whyCardsAnalyzersAtom';
import { useQueryParams } from 'utils/queryUtils';
import { ACTION_STATE_TAG, SELECTED_TIMESTAMP } from 'types/navTags';
import { useAdHoc, adHocAtom, useAdHocExists } from 'atoms/adHocAtom';
import { CardType } from 'components/cards/why-card/types';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { createStyles } from '@mantine/core';
import { FeatureType, useGetSegmentedOutputBasicDataQuery } from 'generated/graphql';
import AdHocBanner from '../header/AdHocBanner';
import StatisticalValuesCard from '../../cards/single-value-cards/StatisticalValuesCard';
import { SegmentedTotalCountCard } from '../../cards/single-value-cards/TotalCountCard';
import { useSuperGlobalDateRange } from '../../super-date-picker/hooks/useSuperGlobalDateRange';

const useStyles = createStyles({
  rootWrap: {
    position: 'relative',
    height: '100%',
    maxWidth: `calc(100% - ${Spacings.leftColumnWidth}px)`,
    width: '100%',
  },
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
    paddingTop: '2px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  noGraphsMessage: {
    fontSize: 16,
    fontWeight: 600,
    margin: 10,
    background: 'white',
    borderRadius: '0.25rem',
    border: `2px solid ${Colors.brandSecondary200}`,
    fontFamily: 'Asap',
    color: Colors.brandSecondary900,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
  },
});

const OutputDetailPanelView = (): ReactElement => {
  const { classes: styles } = useStyles();
  const { modelId, pageType, outputName, segment } = usePageTypeWithParams();
  const featureName = outputName || '';
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { data, loading: loadingBasicData } = useGetSegmentedOutputBasicDataQuery({
    variables: { model: modelId, tags: segment.tags, outputName, ...dateRange },
    skip: loadingDateRange,
  });

  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { deleteQueryParam } = useQueryParams();
  const cardRefs = useRef<Map<CardType, HTMLLIElement | null>>(new Map());
  const firstLoad = useRef(true);
  const { getAnalysisState } = useStateUrlEncoder();
  const haveScrolled = useRef(false);
  const [adHocRunId] = useAdHoc();
  const [adHocRecoilData] = useRecoilState(adHocAtom);
  const adhocExists = useAdHocExists(modelId, pageType, segment);

  const inferenceType = data?.model?.segment?.output?.schema?.inferredType;
  const isNumeric = inferenceType && [FeatureType.Integer, FeatureType.Fraction].includes(inferenceType);

  const resetAnalyzersRecoilState = useResetRecoilState(whyCardsAnalyzersAtom);
  if (firstLoad.current && deleteQueryParam && resetAnalyzersRecoilState) {
    resetAnalyzersRecoilState();
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    if (!actionState) deleteQueryParam(SELECTED_TIMESTAMP);
    firstLoad.current = false;
  }

  const showAdHocBanner =
    adhocExists && (adHocRunId || adHocRecoilData.loading === true || adHocRecoilData.error === true);

  const listStyle = {
    paddingTop: showAdHocBanner ? '8px' : '5px',
  };

  useEffect(() => {
    const { scrollToCard } = getAnalysisState(ACTION_STATE_TAG) ?? {};
    const ref = scrollToCard && cardRefs?.current.get(scrollToCard);
    if (ref && !haveScrolled.current) {
      // hack to wait data load (new drift get taller after loads and break scrolling
      // TODO: #85ztgyeby add a loading state to prevent scroll would be cool in a followup pr)
      setTimeout(() => ref.scrollIntoView({ behavior: 'smooth', block: 'start' }), 3000);
      haveScrolled.current = true;
    }
  }, [getAnalysisState]);

  const renderStandardCards = () => {
    const cards = new Map<CardType, ReactNode>([
      [
        'output',
        <li ref={(el) => cardRefs.current.set('output', el)}>
          <WhyCard
            key={`${featureName}--output`}
            isOutput
            first
            cardType="output"
            manualColumnId={featureName}
            segment={segment}
          />
        </li>,
      ],
      [
        'drift',
        <li ref={(el) => cardRefs.current.set('drift', el)}>
          <WhyCard
            key={`${featureName}--peer-drift`}
            id="peer-drift-card"
            segment={segment}
            manualColumnId={featureName}
            isOutput
            cardType="drift"
          />
        </li>,
      ],
      [
        'singleValues',
        isNumeric ? (
          <li ref={(el) => cardRefs.current.set('singleValues', el)}>
            <StatisticalValuesCard isOutput />
          </li>
        ) : null,
      ],
      [
        'totalCount',
        <li ref={(el) => cardRefs.current.set('totalCount', el)}>
          <SegmentedTotalCountCard isOutput />
        </li>,
      ],
      [
        'missingValues',
        <li ref={(el) => cardRefs.current.set('missingValues', el)}>
          <WhyCard
            key={`${featureName}--missingValues`}
            cardType="missingValues"
            manualColumnId={featureName}
            isOutput
            segment={segment}
          />
        </li>,
      ],
      [
        'uniqueValues',
        <li ref={(el) => cardRefs.current.set('uniqueValues', el)}>
          <WhyCard
            key={`${featureName}--uniqueValues`}
            cardType="uniqueValues"
            manualColumnId={featureName}
            isOutput
            segment={segment}
          />
        </li>,
      ],
      [
        'schema',
        <li ref={(el) => cardRefs.current.set('schema', el)}>
          <WhyCard
            key={`${featureName}--schema`}
            cardType="schema"
            manualColumnId={featureName}
            isOutput
            segment={segment}
          />
        </li>,
      ],
    ]);

    const filteredCards = [...cards.entries()].filter(
      ([cardType, card]) =>
        card !== null && (!adhocExists || !adHocRecoilData.cardType || adHocRecoilData.cardType === cardType),
    );
    if (!filteredCards?.length) {
      return (
        <div className={styles.noGraphsMessage}>
          {loadingBasicData ? 'Loading...' : 'No graph compatible with previewed monitor'}
        </div>
      );
    }
    return (
      <>
        {filteredCards.map(([cardType, Card]) => (
          <React.Fragment key={`feature-card-${cardType}`}>{Card}</React.Fragment>
        ))}
      </>
    );
  };

  const renderCorrelatedAnomalies = () => {
    const renderMainCard = () => {
      if (activeCorrelatedAnomalies.interactionCardType === 'singleValues') {
        return <StatisticalValuesCard isOutput manualColumnId={activeCorrelatedAnomalies.referenceFeature} />;
      }
      if (activeCorrelatedAnomalies.interactionCardType === 'totalCount') {
        return <SegmentedTotalCountCard isOutput manualColumnId={activeCorrelatedAnomalies.referenceFeature} />;
      }
      return (
        <WhyCard
          cardType={activeCorrelatedAnomalies.interactionCardType || 'loading'}
          first
          isOutput
          manualColumnId={activeCorrelatedAnomalies.referenceFeature}
          segment={segment}
        />
      );
    };

    return (
      <>
        <li>{renderMainCard()}</li>
        <li>
          <CorrelatedAnomalies tags={segment?.tags} />
        </li>
      </>
    );
  };

  const renderCardList = () => {
    if (!activeCorrelatedAnomalies?.interactionCardType) {
      return renderStandardCards();
    }
    return renderCorrelatedAnomalies();
  };

  return (
    <div className={styles.rootWrap}>
      {showAdHocBanner && <AdHocBanner />}
      <List className={styles.root} style={{ ...listStyle, position: 'relative' }}>
        <>{renderCardList()}</>
      </List>
    </div>
  );
};

export default OutputDetailPanelView;
