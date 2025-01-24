import { useCallback, useMemo } from 'react';
import { FeatureWeightsFragment, GetFeatureWeightsQuery } from 'generated/graphql';

import { Link } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { HtmlTooltip, stringMax } from '@whylabs/observatory-lib';
import { useHoverBounds } from 'components/tooltips/GenericTooltip';
import { tooltips } from 'strings/tooltips';
import { FeatureWeightBar } from 'components/feature-weights/FeatureWeightBar';
import { FeatureHover, SchemeOptionShape } from 'components/feature-weights/FeatureWeightsTypes';
import { WeightsChartLegend } from 'components/feature-weights/WeightsChartLegend';
import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { NoFeatureWeightsPage } from './NoFeatureWeightsPage';
import { useFeatureWeightsTableStyles } from '../ExplainabilityCSS';

interface FeatureWeightsTableProps {
  props: GetFeatureWeightsQuery;
  modelId: string;
  colorScheme: SchemeOptionShape;
  hovered?: FeatureHover;
  setHovered: React.Dispatch<React.SetStateAction<FeatureHover | undefined>>;
  tableRef: HTMLDivElement | null;
  showModelName?: boolean;
}
export const FeatureWeightsTable: React.FC<FeatureWeightsTableProps> = ({
  props,
  modelId,
  colorScheme,
  hovered,
  setHovered,
  tableRef,
  showModelName = false,
}) => {
  const { classes: styles, cx } = useFeatureWeightsTableStyles();
  const { model } = props;
  const features = model?.filteredFeatures?.results;
  const { getNavUrl } = useNavLinkHandler();
  const [tableBounds, bodyBounds] = useHoverBounds(tableRef, hovered?.hoverData);

  const max = useMemo(() => {
    const maximum =
      features?.reduce((curMax, feature) => {
        const value = Math.abs(feature.weight?.value ?? 0);
        return Math.max(value, curMax);
      }, 0) ?? 1;
    if (maximum === 0) {
      return 1;
    }
    return maximum;
  }, [features]);

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

  const noWeight = (feature?: FeatureWeightsFragment) => {
    return typeof feature?.weight?.value !== 'number';
  };

  const isNegativeWeight = (feature?: FeatureWeightsFragment) => {
    return feature?.weight?.value && feature.weight.value < 0;
  };

  const haveNegativeValues = () => {
    const negative = features?.filter(isNegativeWeight);
    return !!negative?.length;
  };

  const tickMarks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const value = (fraction * max).toFixed(3);
    return Number(value);
  });

  const onOverFeatureLabel = (featureName: string) => {
    setHovered((state) => {
      return {
        ...state,
        featureName,
      };
    });
  };

  const onOver = (featureName: string, pageX: number, pageY: number) => {
    const mouseX = pageX - (tableBounds?.x ?? 0) + (bodyBounds?.x ?? 0);
    const mouseY = pageY - (tableBounds?.y ?? 0) + (bodyBounds?.y ?? 0);
    setHovered({
      featureName,
      hoverData: {
        mouseX,
        mouseY,
      },
    });
  };
  const onOut = () => {
    setHovered(undefined);
  };

  const hoveredColumn = useCallback(
    (featureName: string) => {
      if (hovered === undefined) return undefined;
      return hovered.featureName === featureName;
    },
    [hovered],
  );

  return (
    <div className={styles.table}>
      {model?.filteredFeatures.results.length ? (
        <div>
          {showModelName && (
            <div className={styles.tableHeaderWrapper}>
              <span className={styles.tableHeader}>{model.name}</span>
            </div>
          )}
          {model?.weightMetadata?.hasWeights ? (
            <table className={styles.featureImportanceTable}>
              <tbody>
                <tr>
                  <th className={cx(styles.tableColumnHeader)}>Rank</th>
                  <th className={cx(styles.tableColumnHeader)}>Feature Name</th>
                  <th className={cx(styles.tableColumnHeader, styles.chartCell)}>
                    Global feature importance
                    <HtmlTooltip tooltipContent={tooltips.global_feature_importance} />
                  </th>
                </tr>
                <tr>
                  <td />
                  <td />
                  <td className={styles.chartCell}>
                    {haveNegativeValues() && (
                      <div style={{ padding: '16px 0' }}>
                        <WeightsChartLegend colorScheme={colorScheme} />
                      </div>
                    )}
                    <div className={styles.barChartLegend}>
                      {tickMarks.map((t) => (
                        <span>{t}</span>
                      ))}
                    </div>
                  </td>
                </tr>
                {model.filteredFeatures.results.map((f) => {
                  return (
                    <tr
                      onFocus={(e) =>
                        onOver(f.name, e.target.getBoundingClientRect().x + 250, e.target.getBoundingClientRect().y)
                      }
                      onMouseOver={(e) => onOverFeatureLabel(f.name)}
                      onMouseOut={(e) => onOut()}
                      onBlur={(e) => onOut()}
                    >
                      <td align="right">{f.weight?.rank}</td>
                      <td className={styles.featureNameCell}>
                        <Link
                          className={styles.linkCell}
                          style={{
                            color: colorScheme.positive.labelColor,
                            opacity: noWeight(f) ? 0.4 : 1,
                          }}
                          to={getNavUrl({ page: 'columns', modelId, featureName: f.name })}
                        >
                          <WhyLabsTooltip label={`${f.name}`} position="right" aria-label={`${f.name}`}>
                            <WhyLabsText inherit className={styles.tooltipTextCell}>
                              {stringMax(`${f.name}`, 32)}
                            </WhyLabsText>
                          </WhyLabsTooltip>
                        </Link>
                      </td>
                      <td className={styles.chartCell}>
                        <div onMouseMove={(e) => onOver(f.name, e.pageX, e.pageY)}>
                          <FeatureWeightBar
                            feature={f}
                            xScale={xScale}
                            colorScheme={colorScheme}
                            hovered={hoveredColumn(f.name)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <NoFeatureWeightsPage />
          )}
        </div>
      ) : (
        <div className={styles.noDataFound}>No data found</div>
      )}
    </div>
  );
};
