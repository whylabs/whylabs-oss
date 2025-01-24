import { List } from '@material-ui/core';
import { WhyCard } from 'components/cards';

import { BaselineFieldsFragment, FeatureType } from 'generated/graphql';
import { useRecoilState } from 'recoil';
import StatisticalValuesCard from 'components/cards/single-value-cards/StatisticalValuesCard';
import AdHocBanner from 'components/panels/header/AdHocBanner';
import { adHocAtom, useAdHoc, useAdHocExists } from 'atoms/adHocAtom';
import { SegmentedTotalCountCard } from 'components/cards/single-value-cards/TotalCountCard';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import React, { ReactNode, useContext, useEffect, useRef } from 'react';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { CardType } from 'components/cards/why-card/types';
import { createStyles } from '@mantine/core';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Colors } from '@whylabs/observatory-lib';
import CorrelatedAnomalies from 'components/cards/why-card/correlated-anomalies/CorrelatedAnomalies';

const useStyles = createStyles({
  rootWrap: {
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: 0,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  fakeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    margin: 8,
  },
  fakeCardFirst: {
    marginTop: 16,
  },
  liItem: {
    flexShrink: 0,
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

interface FeatureDetailPanelViewProps {
  readonly baseline: BaselineFieldsFragment | undefined | null;
  segment?: ParsedSegment;
  loadingBasicData?: boolean;
}

const FeatureDetailPanelView = ({
  baseline,
  loadingBasicData,
  segment = { tags: [] },
}: FeatureDetailPanelViewProps): JSX.Element => {
  const { pageType, modelId, featureId } = usePageTypeWithParams();
  const { classes: styles } = useStyles();
  const cardRefs = useRef<Map<CardType, HTMLLIElement | null>>(new Map());
  const [adHocRecoilData] = useRecoilState(adHocAtom);
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const [adHocRunId] = useAdHoc();
  const { getAnalysisState } = useStateUrlEncoder();
  const inferenceType = baseline?.schema?.inferredType;
  const isNumeric = inferenceType && [FeatureType.Integer, FeatureType.Fraction].includes(inferenceType);
  const haveScrolled = useRef(false);
  const adhocExists = useAdHocExists(modelId, pageType, segment);
  useEffect(() => {
    const { scrollToCard } = getAnalysisState(ACTION_STATE_TAG) ?? {};
    const ref = scrollToCard && cardRefs?.current.get(scrollToCard);
    if (ref && inferenceType && !haveScrolled.current) {
      // hack to wait data load (new drift get taller after loads and break scrolling
      // TODO: #85ztgyeby add a loading state to prevent scroll would be cool in a followup pr)
      setTimeout(() => ref.scrollIntoView({ behavior: 'smooth', block: 'start' }), 3000);
      haveScrolled.current = true;
    }
  }, [getAnalysisState, inferenceType]);

  const showAdHocBanner =
    adhocExists && (adHocRunId || adHocRecoilData.loading === true || adHocRecoilData.error === true);

  const listStyle = {
    paddingTop: showAdHocBanner ? '8px' : '5px',
  };

  const renderStandardCards = () => {
    const cards = new Map<CardType, ReactNode>([
      [
        'drift',
        <li ref={(el) => cardRefs.current.set('drift', el)}>
          <WhyCard id="peer-drift-card" segment={segment} cardType="drift" />
        </li>,
      ],
      [
        'singleValues',
        isNumeric ? (
          <li ref={(el) => cardRefs.current.set('singleValues', el)}>
            <StatisticalValuesCard />
          </li>
        ) : null,
      ],
      [
        'totalCount',
        <li ref={(el) => cardRefs.current.set('totalCount', el)}>
          <SegmentedTotalCountCard />
        </li>,
      ],
      [
        'missingValues',
        <li ref={(el) => cardRefs.current.set('missingValues', el)}>
          <WhyCard segment={segment} cardType="missingValues" />
        </li>,
      ],
      [
        'uniqueValues',
        <li ref={(el) => cardRefs.current.set('uniqueValues', el)}>
          <WhyCard segment={segment} cardType="uniqueValues" />
        </li>,
      ],
      [
        'schema',
        <li ref={(el) => cardRefs.current.set('schema', el)}>
          <WhyCard segment={segment} cardType="schema" />
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
          {loadingBasicData ? 'Loading...' : 'No graphs compatible with previewed monitor'}
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
        return <StatisticalValuesCard manualColumnId={activeCorrelatedAnomalies.referenceFeature} />;
      }
      if (activeCorrelatedAnomalies.interactionCardType === 'totalCount') {
        return <SegmentedTotalCountCard manualColumnId={activeCorrelatedAnomalies.referenceFeature} />;
      }
      return (
        <WhyCard
          cardType={activeCorrelatedAnomalies.interactionCardType || 'loading'}
          first
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
    if (
      activeCorrelatedAnomalies &&
      activeCorrelatedAnomalies.interactionCardType &&
      activeCorrelatedAnomalies.referenceFeature === featureId
    ) {
      return renderCorrelatedAnomalies();
    }
    return renderStandardCards();
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

export default FeatureDetailPanelView;
