import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { useGetSegmentProfileLineageQuery } from 'generated/graphql';
import useTypographyStyles from 'styles/Typography';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useFeatureWidgetStyles } from 'hooks/useFeatureWidgetStyles';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { WhyLabsText } from 'components/design-system';
import { Skeleton } from '@mantine/core';
import { getFunctionsForTimePeriod } from 'utils/batchProfileUtils';
import { isNumber } from 'utils/typeGuards';
import { ReactElement } from 'react';
import { ProfilesRangeLink } from '../../profiles-range-link/ProfilesRangeLink';

const WIDGET_TEXTS = {
  DATA: {
    modelOverviewProfilesLineageTooltipContent:
      'A single date range that represents the lineage for all profiles that have been uploaded for this dataset, from the oldest profile to the most recent profile.',
  },
  MODEL: {
    modelOverviewProfilesLineageTooltipContent:
      'A single date range that represents the lineage for all profiles that have been uploaded for this model, from the oldest profile to the most recent profile.',
  },
  LLM: {
    modelOverviewProfilesLineageTooltipContent:
      'A single date range that represents the lineage for all profiles that have been uploaded for this model, from the oldest profile to the most recent profile.',
  },
};

const ProfileLineageWidget = (): ReactElement => {
  const { modelId, featureId, outputName, segment } = usePageTypeWithParams();
  const { resourceTexts } = useResourceText(WIDGET_TEXTS);
  const { classes: styles, cx } = useModelWidgetStyles();
  const { classes: featureWidgetsStyles } = useFeatureWidgetStyles();
  const { classes: typography } = useTypographyStyles();
  const { loading, error, data } = useGetSegmentProfileLineageQuery({
    variables: {
      modelId,
      tags: segment?.tags,
    },
  });
  const profilesDateRange = (() => {
    if (!data?.model) return null;
    const { oldestProfileTimestamp, latestProfileTimestamp } = data.model.segment?.dataLineage ?? {};
    const { setEndOfProfile } = getFunctionsForTimePeriod.get(data.model.batchFrequency) ?? {};
    if (isNumber(oldestProfileTimestamp) && isNumber(latestProfileTimestamp)) {
      const endOfBucket = setEndOfProfile ? setEndOfProfile(latestProfileTimestamp).getTime() : latestProfileTimestamp;
      return [oldestProfileTimestamp, endOfBucket] as [number, number];
    }
    return null;
  })();

  const isFeaturePage = !!featureId || !!outputName;
  const readyToShow = !(loading || error || !data);

  if (error) {
    console.error(`ProfileLineageWidget failed to load batch frequency`, error);
    return <WhyLabsText>-</WhyLabsText>;
  }

  return (
    <div className={cx(featureWidgetsStyles.root, featureWidgetsStyles.lineageWidget)}>
      <div className={isFeaturePage ? styles.column : styles.headlineColumn}>
        <WhyLabsText inherit className={cx(typography.widgetTitle, styles.bolded, styles.headline)}>
          Batch profile lineage
          <HtmlTooltip tooltipContent={resourceTexts.modelOverviewProfilesLineageTooltipContent} />
        </WhyLabsText>

        {readyToShow && (
          <div className={styles.maxContentWidth}>
            <ProfilesRangeLink
              range={profilesDateRange}
              modelId={modelId}
              batchFrequency={data?.model?.batchFrequency ?? null}
              assetCategory={data?.model?.assetCategory ?? null}
              isHeaderWidget
            />
          </div>
        )}
        {loading && (
          <WhyLabsText className={cx(typography.widgetMediumTitle, styles.heroNumber)}>
            <Skeleton variant="text" width={84} height={38} animate />
          </WhyLabsText>
        )}
      </div>
    </div>
  );
};

export default ProfileLineageWidget;
