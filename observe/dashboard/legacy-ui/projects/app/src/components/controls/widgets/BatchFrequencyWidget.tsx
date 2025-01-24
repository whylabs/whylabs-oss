import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { tooltips } from 'strings/tooltips';
import { useGetBatchFrequencyQuery } from 'generated/graphql';
import useTypographyStyles from 'styles/Typography';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Skeleton } from '@material-ui/lab';
import { convertAbbreviationToBatchType } from 'adapters/date/timeperiod';
import { useFeatureWidgetStyles } from 'hooks/useFeatureWidgetStyles';
import { WhyLabsText } from 'components/design-system';

const BatchFrequencyWidget: React.FC = () => {
  const params = usePageTypeWithParams();
  const { classes: styles, cx } = useModelWidgetStyles();
  const { classes: featureWidgetsStyles } = useFeatureWidgetStyles();
  const isFeaturePage = !!params.featureId || !!params.outputName;
  const { classes: typography } = useTypographyStyles();
  const { loading, error, data } = useGetBatchFrequencyQuery({
    variables: {
      modelId: params.modelId,
    },
  });
  const batchFrequency = data?.model?.batchFrequency;
  const readyToShow = !(loading || error || !data);

  if (error) {
    console.error(`BatchFrequencyWidget failed to load batch frequency`, error);
    return <WhyLabsText size="sm">-</WhyLabsText>;
  }

  return (
    <div className={featureWidgetsStyles.root}>
      <div className={isFeaturePage ? styles.column : styles.headlineColumn}>
        <WhyLabsText inherit className={cx(typography.widgetTitle, styles.bolded, styles.headline)}>
          Batch frequency
          <HtmlTooltip tooltipContent={tooltips.model_overview_page_batch_frequency} />
        </WhyLabsText>

        {readyToShow && (
          <WhyLabsText
            inherit
            className={
              isFeaturePage
                ? cx(featureWidgetsStyles.heroText, featureWidgetsStyles.lengthRestricted)
                : cx(typography.widgetMediumTitle)
            }
          >
            {convertAbbreviationToBatchType(batchFrequency)}
          </WhyLabsText>
        )}
        {loading && (
          <WhyLabsText inherit className={cx(typography.widgetMediumTitle)}>
            <Skeleton variant="text" width={84} height={38} animation="wave" />
          </WhyLabsText>
        )}
      </div>
    </div>
  );
};

export default BatchFrequencyWidget;
