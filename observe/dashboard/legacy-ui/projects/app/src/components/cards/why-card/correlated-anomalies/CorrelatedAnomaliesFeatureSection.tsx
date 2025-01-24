import React, { Fragment, useContext, useMemo } from 'react';
import { SegmentTagFilter } from 'generated/graphql';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { TypedEntries } from 'utils/arrayUtils';
import { WhyLabsTypography, WhyLabsAnchor } from 'components/design-system';
import useCorrelatedAnomaliesCSS from './useCorrelatedAnomaliesCSS';
import {
  AnomalyColumnMetric,
  correlatedAnomaliesOptionMetrics,
  CorrelatedCardTypes,
  FeatureAnomalies,
  getCardTypeByMetric,
} from './correlatedAnomaliesUtils';
import { WhyCard } from '../index';
import { SegmentedTotalCountCard } from '../../single-value-cards/TotalCountCard';
import StatisticalValuesCard from '../../single-value-cards/StatisticalValuesCard';

interface FeatureAlertsSectionProps {
  tags: SegmentTagFilter[];
  filterSelected?: boolean;
}
type FeaturesAnomalies = {
  [key: string]: AnomalyColumnMetric[];
};
type FilteredFeatures = {
  [type in CorrelatedCardTypes]?: FeaturesAnomalies;
};

export default function CorrelatedAnomaliesFeatureSection({
  tags,
  filterSelected,
}: FeatureAlertsSectionProps): JSX.Element {
  const { classes } = useCorrelatedAnomaliesCSS();
  const [
    { pipedAnomaliesByMetric, correlatedAnomaliesTypeFilterOption, selectedCorrelatedTimestamp },
    analysisDispatch,
  ] = useContext(AnalysisContext);

  const features: FilteredFeatures = useMemo(() => {
    let filteredFeatures: FilteredFeatures = {};
    const activeFilters = TypedEntries(correlatedAnomaliesTypeFilterOption)
      .filter(([, { checked }]) => checked)
      .reverse();
    activeFilters.forEach(([key]) => {
      if (selectedCorrelatedTimestamp) {
        const anomalies = pipedAnomaliesByMetric?.[key] ?? {};
        const featuresInTimestamp = anomalies[selectedCorrelatedTimestamp] ?? {};
        filteredFeatures = { ...filteredFeatures, [key]: featuresInTimestamp };
      }
    });
    return filteredFeatures;
  }, [correlatedAnomaliesTypeFilterOption, pipedAnomaliesByMetric, selectedCorrelatedTimestamp]);

  const renderSingleValue = (featureId: string, isOutput: boolean) => {
    const props = {
      isOutput,
      manualColumnId: featureId,
      isCorrelatedAnomalies: true,
    };
    return (
      <Fragment key={`${featureId}--statisticalValues`}>
        <StatisticalValuesCard {...props} />
      </Fragment>
    );
  };

  const renderTotalValue = (featureId: string, isOutput: boolean) => {
    const props = {
      isOutput,
      manualColumnId: featureId,
      isCorrelatedAnomalies: true,
    };
    return (
      <Fragment key={`${featureId}--totalValues`}>
        <SegmentedTotalCountCard {...props} />
      </Fragment>
    );
  };

  const renderCard = (featureAnomalies: FeatureAnomalies) => {
    const { metric, column } = featureAnomalies[1][0];
    const cardType = getCardTypeByMetric(metric!);
    const manualColumnId = column ?? '';
    const key = `${column}--${cardType}`;
    const isOutput = manualColumnId.includes('(output)');
    if (cardType === 'singleValues') {
      return renderSingleValue(manualColumnId, isOutput);
    }

    if (cardType === 'totalCount') {
      return renderTotalValue(manualColumnId, isOutput);
    }

    return cardType ? (
      <Fragment key={key}>
        <WhyCard
          cardType={cardType}
          isCorrelatedAnomalies
          manualColumnId={manualColumnId}
          isOutput={isOutput}
          segment={{ tags }}
          key={key}
        />
      </Fragment>
    ) : null;
  };

  const loadMoreFeatures = (cardType: CorrelatedCardTypes) => {
    const firstLoad = correlatedAnomaliesTypeFilterOption[cardType]?.showFeaturesCount === 2;
    let increaseCount = firstLoad ? 8 : 10;
    increaseCount += correlatedAnomaliesTypeFilterOption[cardType]?.showFeaturesCount ?? 0;
    analysisDispatch({
      correlatedAnomaliesTypeFilterOption: {
        ...correlatedAnomaliesTypeFilterOption,
        [cardType]: { checked: true, showFeaturesCount: increaseCount },
      },
    });
  };

  const renderSection = (cardType: CorrelatedCardTypes, correlatedFeatures: FeaturesAnomalies): JSX.Element => {
    const typeFeatures = TypedEntries(correlatedFeatures);
    const slicedFeatures = typeFeatures.slice(0, correlatedAnomaliesTypeFilterOption[cardType]?.showFeaturesCount);
    const sectionTitle = `${correlatedAnomaliesOptionMetrics.get(cardType)?.label || 'Unknown'} (${
      slicedFeatures.length
    } of ${typeFeatures.length})`;
    return (
      <div className={classes.featureAlertSection} key={`section--${cardType}`}>
        <WhyLabsTypography className={classes.featureAlertSectionTitle}>{sectionTitle}</WhyLabsTypography>
        {slicedFeatures.length
          ? slicedFeatures.map(renderCard)
          : filterSelected && (
              <div className={classes.bottomMsgWrap}>
                <WhyLabsTypography className={classes.bottomMsg}>
                  {pipedAnomaliesByMetric
                    ? 'There are no features with anomalies for the chosen timestamp.'
                    : 'Loading...'}
                </WhyLabsTypography>
              </div>
            )}
        {(correlatedAnomaliesTypeFilterOption[cardType]?.showFeaturesCount ?? 0) < typeFeatures.length && (
          <WhyLabsAnchor className={classes.featureAlertSectionBtn} onClick={() => loadMoreFeatures(cardType)}>
            Load more
          </WhyLabsAnchor>
        )}
      </div>
    );
  };

  return (
    <>
      {TypedEntries(features).map(([cardType, correlatedFeatures]) => {
        return renderSection(cardType, correlatedFeatures);
      })}
    </>
  );
}
