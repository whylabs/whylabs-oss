import { CSSProperties, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useTypographyStyles from 'styles/Typography';
import { useFeatureWidgetStyles } from 'hooks/useFeatureWidgetStyles';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { NavHandlerSearchParams, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { useUtilityStyles } from 'styles/UtilityStyles';
import { dateConstructorToReadableISOString, LINEAGE_RANGE } from 'components/super-date-picker/utils';
import { getFullDateFromISO } from 'utils/dateUtils';
import { isNumber } from 'utils/typeGuards';
import { AssetCategory, TimePeriod } from 'generated/graphql';
import { getUsableRangeAndTooltip } from './rangeLimitHelper';
import { useSuperGlobalDateRange } from '../super-date-picker/hooks/useSuperGlobalDateRange';
import { useProfileRangeLinkCSS } from './useProfileRangeLinkCSS';

export interface ProfilesRangeLinkProps {
  range: [number, number] | null;
  modelId: string;
  batchFrequency: TimePeriod | null;
  assetCategory: AssetCategory | null;
  isHeaderWidget?: boolean;
  style?: CSSProperties;
}

type RangeInfoWithAlternateRange = {
  rangeFrom: number | undefined;
  rangeTo: number | undefined;
  alternateRangeFrom: number | undefined;
  alternateRangeTo: number | undefined;
  shouldShowAlternate: boolean;
  tooltipText: string;
};

function createRangeString(rangeFrom: number | undefined, rangeTo: number | undefined): string {
  return `${getFullDateFromISO(new Date(rangeFrom ?? 0).toISOString())} to ${getFullDateFromISO(
    new Date(rangeTo ?? 0).toISOString(),
  )}`;
}

export const ProfilesRangeLink: React.FC<ProfilesRangeLinkProps> = ({
  modelId,
  range,
  batchFrequency,
  assetCategory,
  isHeaderWidget = false,
  style,
}) => {
  const { classes: styles, cx } = useProfileRangeLinkCSS();
  const { classes: utilityStyles } = useUtilityStyles();
  const { classes: typography } = useTypographyStyles();
  const { classes: featureWidgetsStyles } = useFeatureWidgetStyles();
  const pageParams = usePageTypeWithParams();
  const { setDatePickerRange } = useSuperGlobalDateRange();

  const {
    range: vettedRange,
    truncatedRange,
    tooltip,
  } = getUsableRangeAndTooltip(batchFrequency, range, assetCategory, true);
  const mustNotifyUser = !!truncatedRange;
  const handleWidgetClick = () => {
    if (vettedRange && isNumber(vettedRange?.[0]) && isNumber(vettedRange?.[1])) {
      setDatePickerRange(
        {
          from: vettedRange[0],
          to: vettedRange[1],
        },
        LINEAGE_RANGE,
      );
    }
  };

  const { getNavUrl } = useNavLinkHandler();

  const linkStyles =
    pageParams.featureId || pageParams.outputName
      ? cx(styles.linkStyle, featureWidgetsStyles.heroText, featureWidgetsStyles.lengthRestricted)
      : cx(styles.linkStyle, typography.widgetMediumTitle);

  const navLink = useCallback(
    (rangeFrom: number, rangeTo: number) => {
      const params: NavHandlerSearchParams = [
        { name: 'startDate', value: dateConstructorToReadableISOString(rangeFrom) ?? '' },
        { name: 'endDate', value: dateConstructorToReadableISOString(rangeTo) ?? '' },
        { name: 'presetRange', value: LINEAGE_RANGE },
      ];
      return getNavUrl({
        page: 'summary',
        modelId,
        setParams: params,
      });
    },
    [getNavUrl, modelId],
  );

  const renderLink = (rangeString: string, rangeFrom: number | undefined, rangeTo: number | undefined) => (
    <Link className={cx(styles.linkStyle, styles.smallText)} style={style} to={navLink(rangeFrom ?? 0, rangeTo ?? 0)}>
      {rangeString}
    </Link>
  );
  const renderWrappedLink = (rangeProps: RangeInfoWithAlternateRange) => {
    const { rangeFrom, rangeTo, alternateRangeFrom, alternateRangeTo, shouldShowAlternate, tooltipText } = rangeProps;
    const totalString = createRangeString(rangeFrom, rangeTo);
    const [linkRangeFrom, linkRangeTo] = shouldShowAlternate
      ? [alternateRangeFrom, alternateRangeTo]
      : [rangeFrom, rangeTo];
    return <WhyLabsTooltip label={tooltipText}>{renderLink(totalString, linkRangeFrom, linkRangeTo)}</WhyLabsTooltip>;
  };

  const RangeLink: React.FC = () => {
    const [rangeFrom, rangeTo] = range ?? [];
    const [alternateRangeFrom, alternateRangeTo] = vettedRange ?? [];
    const rangeProps: RangeInfoWithAlternateRange = {
      rangeFrom,
      rangeTo,
      alternateRangeFrom,
      alternateRangeTo,
      shouldShowAlternate: mustNotifyUser,
      tooltipText: tooltip,
    };
    const rangeString = createRangeString(rangeFrom, rangeTo);
    return isHeaderWidget ? (
      <WhyLabsTooltip label={tooltip}>
        <button type="button" className={utilityStyles.invisibleButton} onClick={handleWidgetClick}>
          <WhyLabsText className={linkStyles} style={style} inherit>
            {rangeString}
          </WhyLabsText>
        </button>
      </WhyLabsTooltip>
    ) : (
      renderWrappedLink(rangeProps)
    );
  };

  return (
    <div style={style}>
      {vettedRange ? (
        <RangeLink />
      ) : (
        <WhyLabsText inherit className={cx(styles.cardText, styles.cardNoData)}>
          No batch profiles found
        </WhyLabsText>
      )}
    </div>
  );
};
