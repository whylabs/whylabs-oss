import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { WhyLabsTableKit } from 'components/design-system';
import { MemoryRouter } from 'react-router-dom';
import { arrayOfLength } from 'utils/arrayUtils';
import { SortDirection } from 'generated/graphql';
import { WhyLabsTableProps } from '../tableUtils';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, LinkCell, SortableHeaderCell },
} = WhyLabsTableKit;

const TEST_ID = 'WhyLabsTable';
const HEADER_TEST_ID = 'WhyLabsHeaderCell';
const SORTABLE_HEADER_TEST_ID = 'WhyLabsSortableHeaderCell';
const TEST_ROWS_COUNT = 5;
const TEST_URL = '/some-route/test';
const TEST_COLUMNS = ['test text', 'test link'];
const { getAllByRole, getAllByTestId, getByTestId, getByText } = screen;

const defaultTextColumn = (
  <WhyLabsTable.Column
    key="test-text"
    uniqueKey="test-text"
    header={
      <SortableHeaderCell
        sortDirection={SortDirection.Asc}
        onSortDirectionChange={() => {
          /* todo - add a spy here */
        }}
      >{`${TEST_COLUMNS[0]} header`}</SortableHeaderCell>
    }
    cell={(rowNumber) => <TextCell>{`${TEST_COLUMNS[0]} row ${rowNumber}`}</TextCell>}
  />
);

const defaultLinkColumn = (
  <WhyLabsTable.Column
    key="test-link"
    uniqueKey="test-link"
    header={<HeaderCell>{`${TEST_COLUMNS[1]} header`}</HeaderCell>}
    cell={(rowNumber) => <LinkCell to={TEST_URL}>{`${TEST_COLUMNS[1]} row ${rowNumber}`}</LinkCell>}
  />
);

const defaultChildren = [defaultTextColumn, defaultLinkColumn];

describe('<WhyLabsTable />', () => {
  it("should have default testId 'WhyLabsTable'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should render header cells', () => {
    getRenderer();
    expect(getAllByRole('columnheader')).toHaveLength(2);
    expect(getByTestId(SORTABLE_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getAllByTestId(HEADER_TEST_ID)).toHaveLength(2);
  });

  it.each(TEST_COLUMNS)('should have correct header %p', (headerText) => {
    getRenderer();
    expect(getByText(`${headerText} header`)).toBeInTheDocument();
  });

  it.each(TEST_COLUMNS)('should have correct cells %p', (columnText) => {
    getRenderer();
    arrayOfLength(TEST_ROWS_COUNT).forEach((rowIndex) => {
      expect(getByText(`${columnText} row ${rowIndex}`)).toBeInTheDocument();
    });
  });

  it('should render a table with 3 columns, 3 rows and 6 cells', () => {
    const columns = [
      <WhyLabsTable.Column
        key="id"
        uniqueKey="id"
        header={<HeaderCell>ID</HeaderCell>}
        cell={(rowNumber) => <TextCell>{rowNumber}</TextCell>}
      />,
      <WhyLabsTable.Column
        key="name"
        uniqueKey="name"
        header={<HeaderCell>Name</HeaderCell>}
        cell={(rowNumber) => <TextCell>Someone {rowNumber}</TextCell>}
      />,
      <WhyLabsTable.Column
        key="age"
        uniqueKey="age"
        header={<HeaderCell>Age</HeaderCell>}
        cell={(rowNumber) => <TextCell>Age {rowNumber}</TextCell>}
      />,
    ];
    const rowsCount = 2;

    getRenderer({
      children: columns,
      rowsCount,
    });

    expect(getAllByRole('columnheader')).toHaveLength(columns.length);
    expect(getAllByRole('row')).toHaveLength(rowsCount + 1); // 3 rows + 1 header
    expect(getAllByRole('cell')).toHaveLength(rowsCount * columns.length);
  });

  it('should render a table with 2 columns, 6 rows and 12 cells', () => {
    const columns = [
      <WhyLabsTable.Column
        key="id"
        uniqueKey="id"
        header={<HeaderCell>ID</HeaderCell>}
        cell={(rowNumber) => <TextCell>{rowNumber}</TextCell>}
      />,
      <WhyLabsTable.Column
        key="name"
        uniqueKey="name"
        header={<HeaderCell>Name</HeaderCell>}
        cell={(rowNumber) => <TextCell>Someone {rowNumber}</TextCell>}
      />,
    ];
    const rowsCount = 5;

    getRenderer({
      children: columns,
      rowsCount,
    });

    expect(getAllByRole('columnheader')).toHaveLength(columns.length);
    expect(getAllByRole('row')).toHaveLength(rowsCount + 1); // 5 rows + 1 header
    expect(getAllByRole('cell')).toHaveLength(rowsCount * columns.length);
  });
});

// Helpers
function getRenderer({
  children = defaultChildren,
  rowsCount = TEST_ROWS_COUNT,
  ...rest
}: Partial<WhyLabsTableProps> = {}) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <WhyLabsTable.Container rowsCount={rowsCount} {...rest}>
          {children}
        </WhyLabsTable.Container>
      </MemoryRouter>
    </MantineProvider>,
  );
}
