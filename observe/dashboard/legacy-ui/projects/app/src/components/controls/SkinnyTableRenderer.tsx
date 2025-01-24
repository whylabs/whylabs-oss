import { useState } from 'react';

import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import classnames from 'classnames';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { useDeepCompareMemo } from 'use-deep-compare';
import { SortType } from 'types/tableTypes';
import { TableSortLabel } from '@material-ui/core';
import { Cell, Column, Table } from 'fixed-data-table-2';
import { Colors, WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useAdHocExists, disabledBecauseAdHocText, adHocAtom } from 'atoms/adHocAtom';
import { WhyLabsTooltip } from 'components/design-system';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { useRecoilState } from 'recoil';
import { FilterKeys } from 'hooks/useFilterQueryString';
import SkinnyBodyRow from './table/SkinnyBodyRow';
import SkinnySkeletonRow from './table/SkinnySkeletonRow';

const COMPONENT_TEXTS = {
  DATA: {
    headerTitle: 'Column',
    headerOutputsTitle: 'Column',
  },
  MODEL: {
    headerTitle: 'Feature',
    headerOutputsTitle: 'Output',
  },
  LLM: {
    headerTitle: 'Metric',
    headerOutputsTitle: '',
  },
};

const PAGINATION_HEIGHT = 52;
const TABLE_ROW_HEIGHT = 42;
const TABLE_HEADER_ROW_HEIGHT = 42;
const SKELETON_ROW_COUNT = 22;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tableWrapper: {
      height: `calc(100% - ${PAGINATION_HEIGHT}px)`,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: Colors.whiteBackground,
      boxSizing: 'border-box',
    },
    tableRoot: {
      flex: '1 1 auto',
      backgroundColor: Colors.whiteBackground,
      boxSizing: 'border-box',
      borderLeft: '0',
    },
    tableRow: {
      cursor: 'pointer',
    },
    tableRowHover: {
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
    cellFixedheight: {
      maxHeight: '42px',
      minHeight: '42px',
    },
    abbreviatedEmptyCell: {
      maxWidth: '19em',
      minHeight: '42px',
      maxHeight: '42px',
    },
    hideScroll: {
      overflowY: 'scroll',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': {
        width: 0,
      },
    },
    cell: {
      '& .public_fixedDataTableCell_cellContent': {
        padding: 0,
      },
    },
    headerCell: {
      fontSize: '12px',
      lineHeight: 1.67,
      fontFamily: 'Asap, Roboto, sans-serif',
      color: Colors.brandSecondary900,
      borderTop: '0',
    },
    sortDisabled: {
      cursor: 'not-allowed',
      color: `${Colors.brandSecondary600} !important`,
      '& svg': {
        color: `${Colors.brandSecondary600} !important`,
      },
    },
  }),
);

export interface FeatureData {
  name: string;
  alertsCount: number;
}

interface SkinnyTableRendererProps {
  loading: boolean;
  visibleData: FeatureData[];
  tableContainerRef?: React.MutableRefObject<HTMLDivElement | null>;
  handleScroll?: (scrollTop: number) => void;
  onFeatureClick: (feature: string) => void;
}

export interface SkinnyTableContentProps {
  totalData: {
    name: string;
    alertsCount: number;
  }[];
  width: number;
  height: number;
  sortType: SortType;
  loading: boolean;
  toggleSortType: () => void;
  handleFeatureChange: (featureName: string) => void;
}

export const SkinnyTableContent: React.FC<SkinnyTableContentProps> = ({
  totalData,
  width,
  loading,
  height,
  sortType,
  toggleSortType,
  handleFeatureChange,
}) => {
  const styles = useStyles();
  const { resourceTexts } = useResourceText(COMPONENT_TEXTS);
  const { classes: commonStyles, cx } = useCommonStyles();
  const urlParams = usePageTypeWithParams();
  const adHocExists = useAdHocExists();
  const searchTerm = getParam(FilterKeys.searchString);

  function getFeature(): string {
    switch (urlParams.pageType) {
      case 'segmentOutputFeature':
      case 'outputFeature':
        return urlParams.outputName;
      case 'segmentFeature':
      case 'feature':
        return urlParams.featureId;
      default:
        console.log('Unable to get feature name for feature side table, location', urlParams.pageType);
        return '';
    }
  }

  const getHeaderTitle = () => {
    if (urlParams.pageType === 'outputFeature' || urlParams.pageType === 'segmentOutputFeature') {
      return resourceTexts.headerOutputsTitle;
    }
    return resourceTexts.headerTitle;
  };

  return (
    <Table
      rowHeight={TABLE_ROW_HEIGHT}
      rowsCount={loading ? SKELETON_ROW_COUNT : totalData.length}
      width={width}
      height={height}
      headerHeight={TABLE_HEADER_ROW_HEIGHT}
      className={cx(styles.tableRoot, styles.hideScroll)}
      showScrollbarY={false}
      showScrollbarX={false}
    >
      <Column
        header={
          <Cell
            className={cx(
              commonStyles.cellBack,
              commonStyles.bolded,
              commonStyles.tableFirstColumn,
              commonStyles.commonLeftPadding,
              styles.cell,
              styles.headerCell,
            )}
          >
            <WhyLabsTooltip position="right" label={adHocExists ? disabledBecauseAdHocText('sorting') : ''}>
              <TableSortLabel
                hideSortIcon
                active={sortType !== 'natural'}
                direction={sortType === 'ascending' ? 'asc' : 'desc'}
                onClick={toggleSortType}
                className={adHocExists ? cx(styles.sortDisabled) : ''}
              >
                {getHeaderTitle()}
              </TableSortLabel>
            </WhyLabsTooltip>
          </Cell>
        }
        cell={({ rowIndex }) => {
          if (loading) {
            /* eslint-disable react/no-array-index-key */
            return <SkinnySkeletonRow key={`feature-table-row-${rowIndex}`} index={rowIndex} />;
          }

          const data = totalData.length > 0 && !loading ? totalData[rowIndex] : { name: '', alertsCount: 0 };
          const feature = getFeature();
          const highlight = data.name === feature;
          const rowKey = `feature-table-row-${data.name}`;

          return (
            <Cell className={cx(styles.abbreviatedEmptyCell, styles.cell)}>
              <SkinnyBodyRow
                key={rowKey}
                rowData={{ name: data.name, alerts: data.alertsCount }}
                handleClick={handleFeatureChange}
                index={rowIndex}
                highlight={highlight}
                searchTerm={searchTerm ?? ''}
              />
            </Cell>
          );
        }}
        width={width}
      />
    </Table>
  );
};

const SkinnyTableRenderer: React.FC<SkinnyTableRendererProps> = ({
  loading,
  visibleData,
  tableContainerRef,
  handleScroll,
  onFeatureClick,
}) => {
  const styles = useStyles();
  const urlParams = usePageTypeWithParams();
  const [adHocRecoilData] = useRecoilState(adHocAtom);
  const handleFeatureChange = (featureName: string) => {
    if (featureName === urlParams.featureId) {
      return;
    }

    onFeatureClick(featureName);
  };

  const adHocExists = useAdHocExists();
  const [sortType, setSortType] = useState<SortType>('natural');

  const onScroll =
    handleScroll ||
    (() => {
      /**/
    });

  const totalData = useDeepCompareMemo(() => {
    const tempData = visibleData.filter(
      (f) => !adHocExists || (adHocExists && adHocRecoilData.features.includes(f.name)),
    );

    tempData.sort((a, b) => {
      const byAlertCount = adHocExists ? b.alertsCount - a.alertsCount : 0;
      if (sortType === 'ascending') return byAlertCount || a.name.localeCompare(b.name);
      if (sortType === 'descending') return b.name.localeCompare(a.name);
      return byAlertCount;
    });
    return tempData;
  }, [visibleData, sortType]);

  const toggleSortType = () => {
    if (adHocExists) {
      return;
    }

    switch (sortType) {
      case 'natural':
        setSortType('ascending');
        break;
      case 'ascending':
        setSortType('descending');
        break;
      case 'descending':
        setSortType('natural');
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <div
        className={classnames(styles.tableRoot, styles.hideScroll)}
        onScroll={(event) => onScroll((event.target as HTMLDivElement).scrollTop)}
        ref={
          tableContainerRef ||
          (() => {
            /**/
          })
        }
      >
        <WhyLabsAutoSizer>
          {({ width, height }) => (
            <SkinnyTableContent
              width={width}
              height={height}
              loading={loading}
              totalData={totalData}
              toggleSortType={toggleSortType}
              handleFeatureChange={handleFeatureChange}
              sortType={sortType}
            />
          )}
        </WhyLabsAutoSizer>
      </div>
    </div>
  );
};

export default SkinnyTableRenderer;
