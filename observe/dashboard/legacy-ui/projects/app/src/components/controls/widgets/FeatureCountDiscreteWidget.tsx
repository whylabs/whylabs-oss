import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { HtmlTooltip, Colors } from '@whylabs/observatory-lib';
import { useGetAvailableModelFeaturesDiscreteQuery } from 'generated/graphql';
import useTypographyStyles from 'styles/Typography';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Skeleton } from '@mantine/core';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { WhyLabsText } from 'components/design-system';
import { friendlyFormat } from 'utils/numberUtils';
import BarStackWidget from './BarStackWidget';
import { featureCountTexts } from './texts/featureCountTexts';

export type FeatureCountDiscreteWidgetProps = {
  includeInputs?: boolean;
  includeOutputs?: boolean;
  withoutLeftBorder?: boolean;
};

const FeatureCountDiscreteWidget: React.FC<FeatureCountDiscreteWidgetProps> = ({
  includeInputs = true,
  includeOutputs = false,
  withoutLeftBorder,
}: FeatureCountDiscreteWidgetProps) => {
  const params = usePageTypeWithParams();
  const { classes: styles, cx } = useModelWidgetStyles();

  const { resourceTexts } = useResourceText(featureCountTexts);
  const { classes: typography } = useTypographyStyles();
  const { loading, error, data } = useGetAvailableModelFeaturesDiscreteQuery({
    variables: {
      model: params.modelId,
    },
  });
  const countDiscrete =
    ((includeInputs && data?.model?.entitySchema?.inputCounts?.discrete) || 0) +
    ((includeOutputs && data?.model?.entitySchema?.outputCounts?.discrete) || 0);
  const countNonDiscrete =
    ((includeInputs && data?.model?.entitySchema?.inputCounts?.nonDiscrete) || 0) +
    ((includeOutputs && data?.model?.entitySchema?.outputCounts?.nonDiscrete) || 0);
  const total = countDiscrete + countNonDiscrete;

  let title = resourceTexts.totalFeatures;
  let titleTooltip = resourceTexts.totalFeaturesTooltip;
  if (includeInputs && includeOutputs) {
    title = resourceTexts.totalInputsOutputs;
    titleTooltip = resourceTexts.totalInputsOutputsTooltip;
  }
  if (includeOutputs && !includeInputs) {
    title = resourceTexts.totalOutputs;
    titleTooltip = resourceTexts.totalOutputsTooltip;
  }

  const readyToShow = !(loading || error);

  if (error) {
    console.error(`FeatureCountDiscreteWidget failed to load feature counts`, error);
    return <WhyLabsText size="sm">-</WhyLabsText>;
  }

  return (
    <div
      className={cx(styles.root, {
        [styles.withoutLeftBorder]: withoutLeftBorder,
      })}
    >
      <div className={styles.headlineColumn}>
        <WhyLabsText inherit className={cx(typography.widgetTitle, styles.bolded, styles.headline)}>
          {title}
          <HtmlTooltip tooltipContent={titleTooltip} />
        </WhyLabsText>

        {readyToShow && (
          <WhyLabsText inherit className={cx(typography.widgetHighlightNumber, styles.heroNumber)}>{`${friendlyFormat(
            total,
          )}`}</WhyLabsText>
        )}
        {loading && (
          <WhyLabsText inherit className={cx(typography.widgetHighlightNumber, styles.heroNumber)}>
            <Skeleton variant="text" width={84} height={38} animate />
          </WhyLabsText>
        )}
      </div>
      {readyToShow && (
        <div className={styles.column}>
          <BarStackWidget
            counts={[countDiscrete, countNonDiscrete]}
            colors={[Colors.brandPrimary900, Colors.brandPrimary500]}
            labels={['Discrete', 'Non-discrete']}
          />
        </div>
      )}
      {loading && (
        <div className={styles.skeletonWrap}>
          <div>
            <Skeleton variant="rect" width={70} height={14} animate />
            <Skeleton variant="rect" width={70} height={14} animate />
          </div>
          <div>
            <Skeleton variant="rect" width={100} height={14} animate />
            <Skeleton variant="rect" width={100} height={14} animate />
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureCountDiscreteWidget;
