import { Skeleton } from '@mantine/core';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import useTypographyStyles from '~/styles/Typography';
import { getUTCDateRangeString } from '~/utils/dateRangeUtils';
import { DATE_END_QUERY_NAME, DATE_START_QUERY_NAME, PRESET_RANGE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { isNumber } from '~/utils/typeGuards';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { WhyLabsText } from '../design-system';
import { InvisibleButton } from '../misc/InvisibleButton';
import { CUSTOM_RANGE, dateConstructorToReadableISOString } from '../super-date-picker/utils';
import { useRangeLinkCSS } from './useRangeLinkCSS';

type RangeLinkProps = {
  className?: string;
  isHeaderWidget?: boolean;
  isLoading?: boolean;
  notFoundMessage: string;
  presetKey?: string;
  range: [number, number] | null;
  includeHours?: boolean;
};

export const RangeLink = ({
  className,
  isHeaderWidget = false,
  isLoading,
  notFoundMessage,
  presetKey = CUSTOM_RANGE,
  range,
  includeHours = false,
}: RangeLinkProps) => {
  const { classes, cx } = useRangeLinkCSS();
  const { classes: typography } = useTypographyStyles();
  const location = useLocation();
  const { setDatePickerRange } = useSuperGlobalDateRange();

  const handleWidgetClick = () => {
    const [from, to] = range ?? [];
    if (!isNumber(from) || !isNumber(to)) return;
    setDatePickerRange({ from, to }, presetKey);
  };

  const navLink = useCallback(
    (from: number, to: number) => {
      const startDate = dateConstructorToReadableISOString(from);
      const endDate = dateConstructorToReadableISOString(to);

      const searchParams = new URLSearchParams(location.search);
      searchParams.set(DATE_START_QUERY_NAME, startDate ?? '');
      searchParams.set(DATE_END_QUERY_NAME, endDate ?? '');
      searchParams.set(PRESET_RANGE_QUERY_NAME, presetKey);

      return `${location.pathname}?${searchParams.toString()}${location.hash}`;
    },
    [location.hash, location.pathname, location.search, presetKey],
  );

  if (isLoading) return <Skeleton height={18} width={180} />;

  const [from, to] = range ?? [];
  if (!isNumber(from) || !isNumber(to)) {
    return (
      <WhyLabsText inherit className={cx(classes.cardText, classes.cardNoData, className)}>
        {notFoundMessage}
      </WhyLabsText>
    );
  }
  const rangeString = getUTCDateRangeString(from, to, includeHours ? TimePeriod.Pt1H : TimePeriod.P1D, true);

  if (isHeaderWidget) {
    return (
      <InvisibleButton onClick={handleWidgetClick}>
        <WhyLabsText className={cx(classes.linkStyle, typography.widgetMediumTitle, className)} inherit>
          {rangeString}
        </WhyLabsText>
      </InvisibleButton>
    );
  }

  return (
    <Link className={cx(classes.linkStyle, classes.smallText, className)} to={navLink(from, to)}>
      {rangeString}
    </Link>
  );
};
