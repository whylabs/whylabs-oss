import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import WhyLabsTable, { WhyLabsTableProps } from './WhyLabsTable';

const { getAllByRole, getByRole, getByTestId } = screen;

const TEST_ID = 'WhyLabsTable';

describe('<WhyLabsTable />', () => {
  it('should have default testid', () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should have role', () => {
    getRenderer();
    expect(getByRole('table')).toBeInTheDocument();
  });

  it('should render a table with 2 columns, 3 rows and 3 cells', () => {
    getRenderer({
      children: (
        <>
          <WhyLabsTable.Row>
            <WhyLabsTable.Cell>Row 1 Cell 1</WhyLabsTable.Cell>
            <WhyLabsTable.Cell>Row 1 Cell 2</WhyLabsTable.Cell>
          </WhyLabsTable.Row>
          <WhyLabsTable.Row>
            <WhyLabsTable.Cell colSpan={2}>Row 2 Cell 1</WhyLabsTable.Cell>
          </WhyLabsTable.Row>
        </>
      ),
      columns: [
        { key: 'column1', label: 'Column 1' },
        { key: 'column2', label: 'Column 2' },
      ],
    });

    expect(getAllByRole('columnheader')).toHaveLength(2);
    expect(getAllByRole('row')).toHaveLength(3); // 2 rows + 1 header
    expect(getAllByRole('cell')).toHaveLength(3); // one cell has colSpan=2
  });

  it('should render a table with 3 columns, 4 rows and 6 cells', () => {
    getRenderer({
      children: (
        <>
          <WhyLabsTable.Row>
            <WhyLabsTable.Cell colSpan={2}>Row 1 Cell 1</WhyLabsTable.Cell>
            <WhyLabsTable.Cell>Row 1 Cell 2</WhyLabsTable.Cell>
          </WhyLabsTable.Row>
          <WhyLabsTable.Row>
            <WhyLabsTable.Cell colSpan={3}>Row 2 Cell 1</WhyLabsTable.Cell>
          </WhyLabsTable.Row>
          <WhyLabsTable.Row>
            <WhyLabsTable.Cell>Row 3 Cell 1</WhyLabsTable.Cell>
            <WhyLabsTable.Cell>Row 3 Cell 2</WhyLabsTable.Cell>
            <WhyLabsTable.Cell>Row 3 Cell 3</WhyLabsTable.Cell>
          </WhyLabsTable.Row>
        </>
      ),
      columns: [
        { key: 'column1', label: 'Column 1' },
        { key: 'column2', label: 'Column 2' },
        { key: 'column3', label: 'Column 3' },
      ],
    });

    expect(getAllByRole('columnheader')).toHaveLength(3);
    expect(getAllByRole('row')).toHaveLength(4); // 3 rows + 1 header
    expect(getAllByRole('cell')).toHaveLength(6);
  });

  it('should render correct columns headers', () => {
    getRenderer();
    expect(getAllByRole('columnheader')).toHaveLength(3);
    expect(getByRole('columnheader', { name: /id/i })).toBeInTheDocument();
    expect(getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(getByRole('columnheader', { name: /age/i })).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ columns = getColumns(), ...rest }: Partial<WhyLabsTableProps> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsTable columns={columns} {...rest} />
    </MantineProvider>,
  );
}

function getColumns(): WhyLabsTableProps['columns'] {
  return [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
  ];
}
