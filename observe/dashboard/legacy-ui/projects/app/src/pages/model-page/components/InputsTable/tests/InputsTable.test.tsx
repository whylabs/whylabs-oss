/* eslint @typescript-eslint/no-empty-function: 0 */
/* eslint no-underscore-dangle: 0 */

import { AnalysisMetric, FeatureTableQuery, TimePeriod } from 'generated/graphql';
import { ArrayType } from 'pages/page-types/pageUrlQuery';
import { NonNullSchemaSummary } from 'pages/segment-page/SegmentTypes';
import { render } from '@testing-library/react';
import { HEADER_CELL_TEST_ID } from '@whylabs/observatory-lib';
import { HEADER_SORT_CELL_TEST_ID } from 'pages/model-page/HeaderCellSortSelect';
import { featureTypeDisplay } from 'utils/featureTypeDisplay';
import { RecoilRoot } from 'recoil';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { INPUTS_TABLE_TEST_ID, InputsTable } from '../InputsTable';

const firstColHeader = 'Feature';

const expectedColumns = [
  firstColHeader,
  'Anomalies in range',
  'Inf. data type',
  'Total count',
  'Null fraction',
  'Drift distance',
  'Est. unique values',
  'Discreteness',
  'Data type count',
];

const data: FeatureTableQuery = {
  model: {
    batchFrequency: TimePeriod.P1D,
    filteredFeatures: {
      results: [], // TODO: Mock actual data
      totalCount: 0,
    },
  },
};

type DataType = ArrayType<typeof tableData>;
const tableData = data.model?.filteredFeatures.results || [];

function WrappedInputsTable() {
  return (
    <MockedProvider>
      <RecoilRoot>
        <MemoryRouter>
          <InputsTable
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            nameHeaderTitle={firstColHeader}
            height={800}
            width={1600}
            onSortDirectionChange={() => {}}
            data={tableData}
            sortBy={undefined}
            sortDirection={undefined}
            labelingPropName="createdAt"
            driftData={(item: DataType) => [
              item.events,
              ({ explanation }) =>
                explanation && explanation.__typename === 'ThresholdEventExplanation' ? explanation.observedValue : 0,
            ]}
            getInfDataType={(item) => {
              const type = item.baselineSketch?.schemaSummary?.inference?.type;
              return type ? featureTypeDisplay(type) : undefined;
            }}
            isDiscrete={(item) => item.baselineSketch?.showAsDiscrete}
            name={(item) => item.name}
            nameLink={() => ''}
            typeCountData={(item: DataType) => [
              item.sketches.sort((a, b) => a.createdAt - b.createdAt),
              ({ schemaSummary }) => (schemaSummary as NonNullSchemaSummary).inference.count,
            ]}
            uniqueData={(item: DataType) => [
              item.sketches.sort((a, b) => a.createdAt - b.createdAt),
              ({ uniqueCount }) => uniqueCount?.estimate || 0,
            ]}
            isHourly={false}
            nullRatioData={(item: DataType) => [
              item.sketches.sort((a, b) => a.createdAt - b.createdAt),
              ({ nullRatio }) => nullRatio,
            ]}
            totalCountData={(item: DataType) => [
              item.sketches.sort((a, b) => a.createdAt - b.createdAt),
              ({ totalCount }) => totalCount,
            ]}
            anomaliesData={data?.model?.filteredFeatures.results.map((f) => f.anomalyCounts ?? null) ?? null}
            totalCountAnomalies={(item) =>
              item.anomalyCounts?.totals.reduce((acc, anomaly) => acc + anomaly.count, 0) || 0
            }
            hasUniqueDataAnomalies={(item) => {
              return !!item.anomalyCounts?.timeseries.some((a) =>
                a.counts.some(
                  (c) => c.metric && [AnalysisMetric.UniqueEst, AnalysisMetric.UniqueEstRatio].includes(c.metric),
                ),
              );
            }}
            hasTypeCountsAnomalies={(item) => {
              return !!item.anomalyCounts?.timeseries.some((a) =>
                a.counts.some((c) => c.metric === AnalysisMetric.InferredDataType),
              );
            }}
            hasNullRatioAnomalies={(item) => {
              return !!item.anomalyCounts?.timeseries.some((a) =>
                a.counts.some(
                  (c) => c.metric && [AnalysisMetric.CountNullRatio, AnalysisMetric.CountNull].includes(c.metric),
                ),
              );
            }}
            hasDriftAnomalies={(item) => {
              return !!item.anomalyCounts?.totals?.find((a) => a.category === 'DataDrift' && a.count > 0);
            }}
          />
        </MemoryRouter>
      </RecoilRoot>
    </MockedProvider>
  );
}

describe('InputsTable', () => {
  it('Renders', () => {
    const { getByTestId } = render(<WrappedInputsTable />);
    const table = getByTestId(INPUTS_TABLE_TEST_ID);

    expect(table).toBeInTheDocument();
  });

  it('Has all columns', () => {
    const { getAllByTestId } = render(<WrappedInputsTable />);
    const sortColumns = getAllByTestId(HEADER_SORT_CELL_TEST_ID);
    const columns = getAllByTestId(HEADER_CELL_TEST_ID);

    [...sortColumns, ...columns].forEach((col, i) => {
      const expectedColumn = expectedColumns[i];
      expect(col.innerHTML).toBe(expectedColumn);
    });
  });
});
