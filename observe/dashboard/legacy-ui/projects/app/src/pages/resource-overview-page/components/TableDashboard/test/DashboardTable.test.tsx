import { render, screen } from '@testing-library/react';
import { HEADER_SORT_CELL_TEST_ID } from 'pages/model-page/HeaderCellSortSelect';
import { HEADER_CELL_TEST_ID } from '@whylabs/observatory-lib';
import { RecoilRoot } from 'recoil';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { SortDirection } from 'generated/graphql';
import { mockUseWhyLabsSnackbar } from 'hooks/mocks/mockUseSnackbar';
import DashboardTable, { OverviewTableProps } from '../DashboardTable/DashboardTable';
import { data, queryMock, refetchData } from './mockData';

const { getAllByRole, getAllByTestId } = screen;

const TABLE_COLUMNS = [
  { label: 'Resource', sortable: true },
  { label: 'Freshness', sortable: true },
  { label: 'Resource type', sortable: true },
  { label: 'Anomalies in range', sortable: true },
  { label: 'Last profile with anomalies', sortable: true },
  { label: 'Batch frequency', sortable: false },
  { label: 'Columns', sortable: false },
  { label: 'Outputs', sortable: false },
  { label: 'Segments', sortable: false },
  { label: 'Reference profiles', sortable: false },
  { label: 'Batch profile lineage', sortable: false },
];

const SORTABLE_COLUMNS = TABLE_COLUMNS.filter((c) => c.sortable);
const NON_SORTABLE_COLUMNS = TABLE_COLUMNS.filter((c) => !c.sortable);

describe('DashboardTable', () => {
  beforeEach(() => {
    mockUseWhyLabsSnackbar();
  });

  it('should render all columns', () => {
    getRenderer();
    expect(getAllByRole('columnheader')).toHaveLength(TABLE_COLUMNS.length);
  });

  it('should render all sortable columns with correct name', () => {
    getRenderer();

    const columns = getAllByTestId(HEADER_SORT_CELL_TEST_ID);
    columns.forEach((col, i) => {
      const expectedColumn = SORTABLE_COLUMNS[i];
      expect(col.innerHTML).toBe(expectedColumn.label);
    });
  });

  it('should render all non sortable columns with correct name', () => {
    getRenderer();

    const columns = getAllByTestId(HEADER_CELL_TEST_ID);
    columns.forEach((col, i) => {
      const expectedColumn = NON_SORTABLE_COLUMNS[i];
      expect(col.innerHTML).toBe(expectedColumn.label);
    });
  });
});

// Helpers
function getRenderer() {
  return render(
    <MockedProvider mocks={queryMock} addTypename={false}>
      <RecoilRoot>
        <MemoryRouter>
          <DashboardTable {...DEFAULT_PROPS} />
        </MemoryRouter>
      </RecoilRoot>
    </MockedProvider>,
  );
}

const DEFAULT_PROPS: OverviewTableProps = {
  width: 1600,
  height: 800,
  refetchData,
  data: data.models,
  handleSort: () => {
    /* */
  },
  searchTerm: '',
  sortDirection: SortDirection.Asc,
  sortBy: 'Name',
};
