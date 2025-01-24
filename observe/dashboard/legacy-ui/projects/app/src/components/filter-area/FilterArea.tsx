import { createStyles } from '@mantine/core';
import { Colors, HtmlTooltip, Spacings } from '@whylabs/observatory-lib';
import { disabledBecauseAdHocText, useAdHocExists } from 'atoms/adHocAtom';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { WhyLabsSearchInput, WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { getParam, getParams } from 'pages/page-types/usePageType';

import { useDebouncedState } from '@mantine/hooks';
import { useSearchParams } from 'react-router-dom';
import { ButtonControls, SortControlProps } from './components/ButtonControls';
import { FilterControlProps } from './utils';

const useStyles = createStyles(() => ({
  root: {
    zIndex: 100,
    flexBasis: '300px',
    minWidth: '300px',
    backgroundColor: Colors.white,
    height: '100%',
    padding: Spacings.pageLeftPadding,
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
  },
  titleRoot: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontWeight: 600,
    fontSize: '14px',
    color: Colors.brandSecondary900,
    fontFamily: 'Asap,Roboto,sans-serif',
  },
  filterLabelText: {
    fontSize: '12px',
    color: Colors.brandSecondary900,
    fontFamily: 'Asap,Roboto,sans-serif',
    lineHeight: '1.5',
    fontWeight: 400,
  },
  searchRoot: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  divWrapper: {
    marginTop: '7px',
  },
}));

export type FilterAreaProps<SortBy extends string | undefined> = SortControlProps<SortBy> & {
  readonly titleText: string;
  readonly tooltipContent?: string;
  readonly customBackgroundColor?: string;
  placeholder?: string;
} & FilterControlProps;

export const FilterArea = <SortBy extends string | undefined>({
  sortByDirection,
  sortBy,
  titleText,
  tooltipContent,
  customBackgroundColor,
  checkboxFilterList,
  sortFieldsList,
  sortSetter,
  placeholder,
  filterKey,
  filterDropDownTitle,
}: FilterAreaProps<SortBy>): JSX.Element => {
  const { classes: styles, cx } = useStyles();
  const enableFilter = Boolean(filterKey);
  const enableSort = Boolean(sortBy && sortByDirection);
  const searchWidth = 280 - (enableSort ? 40 : 0) - (enableFilter ? 40 : 0);
  const adHocExists = useAdHocExists();
  const [, setSearchParams] = useSearchParams();
  const currentSearchString = getParam(FilterKeys.searchString) ?? '';
  const [stagedSearchText, setStagedSearchText] = useDebouncedState<string>(currentSearchString, 250);
  if (currentSearchString !== stagedSearchText) {
    setSearchParams((curr) => {
      curr.delete(FilterKeys.searchString);
      if (stagedSearchText) curr.set(FilterKeys.searchString, stagedSearchText);
      return curr;
    });
  }

  const onInputChange = (value: string) => setStagedSearchText(value);

  function getFilterLabel() {
    const numFilters = getEnabledFilterNum();

    switch (numFilters) {
      case 0:
        return 'No filters applied';
      case 1:
        return '1 filter applied';
      default:
        return `${numFilters} filters applied`;
    }
  }

  function getEnabledFilterNum() {
    if (!filterKey) return 0;
    return getParams(filterKey)?.length ?? 0;
  }

  return (
    <div className={styles.root} data-testid="filter-area__root" style={{ background: customBackgroundColor }}>
      <div className={styles.titleRoot}>
        <WhyLabsText className={styles.titleText}>
          {titleText}
          {tooltipContent && <HtmlTooltip tooltipContent={tooltipContent} />}
        </WhyLabsText>

        {enableFilter && <WhyLabsText className={styles.filterLabelText}>{getFilterLabel()}</WhyLabsText>}
      </div>

      <div className={cx(styles.searchRoot, styles.divWrapper)}>
        <WhyLabsTooltip label={adHocExists ? disabledBecauseAdHocText('filtering') : ''}>
          <div style={{ width: searchWidth }} data-testid="filter-area__input">
            <WhyLabsSearchInput
              label={titleText}
              hideLabel
              placeholder={placeholder}
              onChange={onInputChange}
              defaultValue={stagedSearchText}
              disabled={adHocExists}
            />
          </div>
        </WhyLabsTooltip>
        {(enableFilter || enableSort) && (
          <ButtonControls<SortBy>
            filterKey={filterKey!}
            filterDropDownTitle={filterDropDownTitle}
            sortByDirection={sortByDirection}
            sortBy={sortBy}
            sortSetter={sortSetter}
            checkboxFilterList={checkboxFilterList}
            sortFieldsList={sortFieldsList}
          />
        )}
      </div>
    </div>
  );
};
