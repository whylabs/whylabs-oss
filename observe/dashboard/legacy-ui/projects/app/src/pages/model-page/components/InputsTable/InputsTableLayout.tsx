import { ExpandedData } from 'utils/expandTableData';
import { WhyLabsAutoSizer, Colors, NoDataMessage, TableLoading, SafeLink } from '@whylabs/observatory-lib';
import { FeatureSortBy, TimePeriod } from 'generated/graphql';
import { createCommonTexts } from 'strings/commonTexts';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { WhyLabsText, WhyLabsTableKit } from 'components/design-system';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { createStyles } from '@mantine/core';
import { InputsTable, InputsTableBaseProps } from './InputsTable';

const {
  Footer: { Pagination },
} = WhyLabsTableKit;

const COMMON_TEXTS = createCommonTexts({});
const FILE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
  },
  MODEL: {
    ...COMMON_TEXTS,
  },
  LLM: {
    ...COMMON_TEXTS,
  },
};

export interface InputsTableLayoutProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData> {
  readonly loading: boolean;
  readonly error: boolean;
  readonly data: NonNullable<T>[];
  readonly totalItems: number;
  readonly batchFrequency: TimePeriod | undefined;
  readonly sortBy: FeatureSortBy | undefined;
  readonly hasWeights?: boolean;
  tableProps: InputsTableBaseProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData>;
}

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    '& .fixedDataTableLayout_rowsContainer': {
      backgroundColor: Colors.brandSecondary100,
    },
  },
  autoWrapper: {
    flexGrow: 1,
  },
}));

export function InputsTableLayout<
  T,
  NullRatioData extends Record<string, unknown>,
  TotalCountData extends Record<string, unknown>,
  UniqueData extends Record<string, unknown>,
  TypeCountData extends Record<string, unknown>,
  DriftData extends ExpandedData,
>(props: InputsTableLayoutProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData>): JSX.Element {
  const { loading, error, data, batchFrequency, totalItems, sortBy, tableProps, hasWeights = false } = props;
  const { classes: styles } = useStyles();
  const { resourceTexts } = useResourceText(FILE_TEXTS);
  const { modelId, segment } = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();
  if (loading) {
    return <TableLoading />;
  }

  if (error) {
    console.error('Error looking up alert data', error);
    return (
      <NoDataMessage>
        <WhyLabsText>{resourceTexts.errorLoadingData}</WhyLabsText>
      </NoDataMessage>
    );
  }

  const performanceUrl = getNavUrl({ modelId, page: 'performance', segmentTags: segment });

  if (data.length === 0) {
    return (
      <NoDataMessage>
        {getParam(FilterKeys.searchString) ? (
          <WhyLabsText>{resourceTexts.noDataFound}</WhyLabsText>
        ) : (
          <WhyLabsText>
            No column data found. Model performance metrics can be found{' '}
            <SafeLink sameTab href={performanceUrl}>
              here
            </SafeLink>
            .
          </WhyLabsText>
        )}
      </NoDataMessage>
    );
  }
  return (
    <div className={styles.root}>
      <div className={styles.autoWrapper}>
        <WhyLabsAutoSizer>
          {({ height, width }) => (
            <div>
              <InputsTable
                {...tableProps}
                height={height}
                width={width}
                data={data}
                batchFrequency={batchFrequency}
                sortBy={sortBy}
                hasWeights={hasWeights}
              />
            </div>
          )}
        </WhyLabsAutoSizer>
      </div>

      <Pagination loading={loading} rowCount={totalItems} renderingOutsideTable />
    </div>
  );
}
