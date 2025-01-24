import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { mockUsePagingInfo } from 'hooks/mocks/mockUsePagingInfo';
import WhyLabsTablePagination from './WhyLabsTablePagination';

const { getByRole, getByText, queryByRole, queryByText } = screen;

describe('<WhyLabsTablePagination />', () => {
  beforeEach(() => {
    mockUsePagingInfo();
  });

  it('should render rows per page text', () => {
    getRenderer();
    expect(getByText(/rows per page:/i)).toBeInTheDocument();
  });

  it('should render rows per page selector', () => {
    getRenderer();
    expect(getByRole('combobox', { name: /select how many rows per page/i })).toBeInTheDocument();
  });

  it.each([20, 30, 40, 50])('should render rows per page selector with value %p', (rowsPerPage) => {
    mockUsePagingInfo({
      pagingInfo: { limit: rowsPerPage, offset: 0 },
    });

    getRenderer();
    expect(getByRole('combobox')).toHaveValue(rowsPerPage.toString());
  });

  it.each([
    ['1-10 of 100', { page: 0, rowsPerPage: 10, rowCount: 100 }],
    ['11-20 of 100', { page: 1, rowsPerPage: 10, rowCount: 100 }],
    ['41-60 of 100', { page: 2, rowsPerPage: 20, rowCount: 100 }],
    ['181-200 of 200', { page: 9, rowsPerPage: 20, rowCount: 200 }],
  ])('should render displayed %p rows text', (expected, { page, rowsPerPage, rowCount }) => {
    mockUsePagingInfo({
      pagingInfo: { limit: rowsPerPage, offset: page * rowsPerPage },
      page,
    });

    getRenderer({ rowCount });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it('should render pagination actions', () => {
    getRenderer();

    expect(getByRole('button', { name: /previous page/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /^current page 1$/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /^go to page 2$/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /^go to page 3$/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /^go to page 4$/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /^go to page 5$/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /^go to page 10$/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /next page/i })).toBeInTheDocument();
  });

  it('should render pagination actions with different setup', () => {
    mockUsePagingInfo({
      pagingInfo: { limit: 20, offset: 180 },
      page: 9,
    });

    getRenderer({
      rowCount: 1000,
    });

    // First page
    expect(getByRole('button', { name: /^go to page 1$/i })).toBeInTheDocument();

    // Previous page
    expect(getByRole('button', { name: /^go to page 9$/i })).toBeInTheDocument();

    // Current page
    expect(getByRole('button', { name: /^current page 10$/i })).toBeInTheDocument();

    // Next page
    expect(getByRole('button', { name: /^go to page 11$/i })).toBeInTheDocument();

    // Last page
    expect(getByRole('button', { name: /^go to page 50$/i })).toBeInTheDocument();
  });

  it('should not render elements when it is loading', () => {
    getRenderer({ loading: true });
    expect(queryByText(/rows per page:/i)).not.toBeInTheDocument();
    expect(queryByRole('combobox')).not.toBeInTheDocument();
    expect(queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call setPage when pagination action is clicked', () => {
    const setPage = jest.fn();
    mockUsePagingInfo({ setPage });

    getRenderer();

    userEvent.click(getByRole('button', { name: /^go to page 2$/i }));
    expect(setPage).toHaveBeenCalledWith(1);

    userEvent.click(getByRole('button', { name: /^go to page 10$/i }));
    expect(setPage).toHaveBeenCalledWith(9);

    expect(setPage).toHaveBeenCalledTimes(2);
  });

  it('should call setPageSize when rows per page selector is changed', () => {
    const setPageSize = jest.fn();
    mockUsePagingInfo({
      pagingInfo: { limit: 30, offset: 0 },
      setPageSize,
    });

    getRenderer();

    userEvent.selectOptions(getByRole('combobox'), '30');
    expect(setPageSize).toHaveBeenCalledWith(30);

    userEvent.selectOptions(getByRole('combobox'), '50');
    expect(setPageSize).toHaveBeenCalledWith(50);

    expect(setPageSize).toHaveBeenCalledTimes(2);
  });

  it('should render custom rows per page selector', () => {
    mockUsePagingInfo({
      pagingInfo: { limit: 32, offset: 0 },
    });

    getRenderer();
    const selectItem = getByRole('combobox');
    expect(selectItem).toBeInTheDocument();
    expect(selectItem).toHaveValue('32');
    const formValues = selectItem.querySelectorAll('option');
    expect(formValues).toHaveLength(6);
    expect(formValues[2]).toHaveValue('32');
  });

  it('should render custom page size options', () => {
    const customSizeOptions = [2, 5, 11];
    mockUsePagingInfo({
      pagingInfo: { limit: 11, offset: 0 },
    });

    getRenderer({ customSizeOptions });
    const selectItem = getByRole('combobox');
    expect(selectItem).toBeInTheDocument();
    expect(selectItem).toHaveValue('11');
    const formValues = selectItem.querySelectorAll('option');
    expect(formValues).toHaveLength(3);
    expect(formValues[0]).toHaveValue('2');
    expect(formValues[1]).toHaveValue('5');
    expect(formValues[2]).toHaveValue('11');
  });

  it.each(['A child message', 'Another child message'])('should render left children with  %p', (message) => {
    getRenderer({ leftChildren: <p>{message}</p> });
    expect(getByText(message)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ rowCount = 100, ...rest }: Partial<ComponentProps<typeof WhyLabsTablePagination>> = {}) {
  return render(
    <MemoryRouter>
      <MantineProvider>
        <table>
          <WhyLabsTablePagination rowCount={rowCount} {...rest} />
        </table>
      </MantineProvider>
    </MemoryRouter>,
  );
}
