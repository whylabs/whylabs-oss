import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { atom, useRecoilState } from 'recoil';

import { FeatureWeightsFragment } from 'generated/graphql';
import { useCallback, useMemo, useState } from 'react';
import { stringMax } from '@whylabs/observatory-lib';
import { Link } from 'react-router-dom';
import { useColorSchemePalette } from 'components/feature-weights/FeatureWeightsTypes';
import { FeatureWeightBar } from 'components/feature-weights/FeatureWeightBar';
import { WeightsChartLegend } from 'components/feature-weights/WeightsChartLegend';
import { labels } from 'strings/labels';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import NoDataContent from './NoDataContent';
import LastDataBatch from './components/LastDataBatch';

export interface ExplainabilityCardAtomState {
  data?: FeatureWeightsFragment[];
  latestTimeStamp: number;
  loading: boolean;
  hasWeights?: boolean;
}
export const explainabilityCardAtom = atom<ExplainabilityCardAtomState>({
  key: 'explainabilityCardAtom',
  default: {
    latestTimeStamp: 0,
    loading: true,
  },
});

const ExplainabilityCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();
  const [featureImportanceData] = useRecoilState(explainabilityCardAtom);
  const primaryColorScheme = useColorSchemePalette('primary');
  const { data, loading, hasWeights, latestTimeStamp } = featureImportanceData;
  const [hoveredFeature, setHoveredFeature] = useState<string>();

  const max = useMemo(() => {
    const maximum =
      data?.reduce((curMax, feature) => {
        const value = Math.abs(feature.weight?.value ?? 0);
        return Math.max(value, curMax);
      }, 0) ?? 1;
    if (maximum === 0) {
      return 1;
    }
    return maximum;
  }, [data]);

  const xScale: (feature: FeatureWeightsFragment) => number = useCallback(
    (feature) => {
      if (max !== 0) {
        const weight = Math.abs(feature.weight?.value ?? 0);
        return weight / max;
      }
      return 0;
    },
    [max],
  );

  const tickMarks = [0, 0.5, 1].map((fraction) => {
    const value = (fraction * max).toFixed(2);
    return Number(value);
  });

  const isNegativeWeight = (feature?: FeatureWeightsFragment) => {
    return feature?.weight?.value && feature.weight.value < 0;
  };

  const haveNegativeValues = () => {
    const negative = data?.filter(isNegativeWeight);
    return !!negative?.length;
  };

  const footer: SummaryCardFooterProps = hasWeights
    ? {
        footerIcon: true,
        footerLink: getNavUrl({ page: 'explainability', modelId }),
        footerLinkNewTab: false,
        footerTxt: 'View explainability',
      }
    : {
        footerIcon: true,
        footerLink: 'https://docs.whylabs.ai/docs/explainability',
        footerLinkNewTab: true,
        footerTxt: 'Get started with explainability',
      };

  function renderChart() {
    return (
      <>
        {haveNegativeValues() && (
          <div style={{ paddingBottom: 10 }}>
            <WeightsChartLegend size="sm" colorScheme={primaryColorScheme} />
          </div>
        )}
        <div className={styles.explainabilityChartLegend}>
          {tickMarks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <hr className={styles.cardDivider} style={{ marginTop: 0 }} />
        <span className={styles.legendDescription}>(Absolute value)</span>
        {data?.map((f) => (
          <div
            key={f.name}
            style={{ paddingTop: '10px' }}
            onFocus={() => setHoveredFeature(f.name)}
            onMouseOver={() => setHoveredFeature(f.name)}
            onMouseLeave={() => setHoveredFeature(undefined)}
          >
            <Link className={styles.featureLink} to={getNavUrl({ page: 'columns', modelId, featureName: f.name })}>
              <p className={styles.featureLink}>{stringMax(`${f.name}`, 32)}</p>
              <FeatureWeightBar
                hovered={f.name === hoveredFeature}
                feature={f}
                xScale={xScale}
                colorScheme={primaryColorScheme}
                height={12}
              />
            </Link>
          </div>
        ))}
      </>
    );
  }

  function renderStructureIfHasData() {
    if (!hasWeights) {
      return <NoDataContent displayText="No feature weights available" />;
    }
    return (
      <>
        {renderChart()}
        {/* <span className={styles.contentSubtitle}>Method:</span>
          <span className={styles.contentTxt}>Normalized SHAP</span> TODO: We don't know this informations yet
        */}
        {latestTimeStamp && (
          <LastDataBatch
            label="Last explainability report"
            noTimestampLabel="No report data"
            timestamp={latestTimeStamp}
          />
        )}
      </>
    );
  }

  return (
    <SummaryCard
      cardLoading={loading}
      cardTooltip="A list of the top five most important features for this model, as determined by the absolute value of their feature weights"
      customCard={customCard}
      footer={footer}
      loadingCardHeight={236}
    >
      {data ? renderStructureIfHasData() : <NoDataContent displayText={labels.summary.no_data} />}
    </SummaryCard>
  );
};
export default ExplainabilityCard;
