import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { mockUsePagingInfo } from '~/hooks/mocks/mockUsePagingInfo';

import WhyLabsTableSimplePagination from './WhyLabsTableSimplePagination';

const { getByRole, getByTestId, getByText, queryByRole, queryByText } = screen;

describe('<WhyLabsTableSimplePagination />', () => {
  beforeEach(() => {
    mockUsePagingInfo();
  });

  it('should render the component with test id', () => {
    getRenderer({ hasNextPage: true });
    expect(getByTestId('WhyLabsTableSimplePagination')).toBeInTheDocument();
  });

  it('should render when not first page and there is no next page', () => {
    mockUsePagingInfo({
      pagingInfo: { limit: 10, offset: 20 },
      page: 2,
    });
    getRenderer({ hasNextPage: false });

    expect(getByTestId('WhyLabsTableSimplePagination')).toBeInTheDocument();
  });

  it('should render rows per page text', () => {
    getRenderer();
    expect(getByText(/rows per page:/i)).toBeInTheDocument();
  });

  it('should render rows per page selector', () => {
    getRenderer();
    expect(getByRole('combobox', { name: /select how many rows per page/i })).toBeInTheDocument();
  });

  it.each([10, 25, 50, 75, 100])('should render rows per page selector with value %p', (rowsPerPage) => {
    mockUsePagingInfo({
      pagingInfo: { limit: rowsPerPage, offset: 0 },
    });

    getRenderer();
    expect(getByRole('combobox')).toHaveValue(rowsPerPage.toString());
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

  it.each([
    { page: 0, rowsPerPage: 10 },
    { page: 2, rowsPerPage: 25 },
    { page: 9, rowsPerPage: 25 },
  ])('should render %p row text', ({ page, rowsPerPage }) => {
    mockUsePagingInfo({
      pagingInfo: { limit: rowsPerPage, offset: page * rowsPerPage },
      page,
    });

    getRenderer();
    expect(getByText(`Page ${page + 1}`)).toBeInTheDocument();
  });

  it('should render next page button enabled', () => {
    getRenderer({ hasNextPage: true });

    expect(getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(getByRole('button', { name: /next page/i })).toBeEnabled();
  });

  it('should render both buttons enabled', () => {
    mockUsePagingInfo({
      pagingInfo: { limit: 20, offset: 180 },
      page: 9,
    });
    getRenderer({ hasNextPage: true });

    expect(getByRole('button', { name: /previous page/i })).toBeEnabled();
    expect(getByRole('button', { name: /next page/i })).toBeEnabled();
  });

  it('should render next previous button enabled', () => {
    mockUsePagingInfo({
      pagingInfo: { limit: 20, offset: 180 },
      page: 9,
    });
    getRenderer({ hasNextPage: false });

    expect(getByRole('button', { name: /previous page/i })).toBeEnabled();
    expect(getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('should render other positive numbers in the combobox when fed that by the url', () => {
    mockUsePagingInfo({
      pagingInfo: { limit: 32, offset: 0 },
      page: 0,
    });
    getRenderer({ hasNextPage: true });
    const selectItem = getByRole('combobox');
    expect(selectItem).toBeInTheDocument();
    expect(selectItem).toHaveValue('32');
    const formValues = selectItem.querySelectorAll('option');
    expect(formValues).toHaveLength(6);
    expect(formValues[0]).toHaveValue('10');
    expect(formValues[1]).toHaveValue('25');
    expect(formValues[2]).toHaveValue('32');
    expect(formValues[3]).toHaveValue('50');
    expect(formValues[4]).toHaveValue('75');
    expect(formValues[5]).toHaveValue('100');
  });

  it('should not render page number buttons', () => {
    mockUsePagingInfo({
      pagingInfo: { limit: 20, offset: 180 },
      page: 9,
    });

    getRenderer();

    // First page
    expect(queryByRole('button', { name: /^go to page 1$/i })).not.toBeInTheDocument();

    // Previous page
    expect(queryByRole('button', { name: /^go to page 9$/i })).not.toBeInTheDocument();

    // Current page
    expect(queryByRole('button', { name: /^current page 10$/i })).not.toBeInTheDocument();

    // Next page
    expect(queryByRole('button', { name: /^go to page 11$/i })).not.toBeInTheDocument();

    // Last page
    expect(queryByRole('button', { name: /^go to page 50$/i })).not.toBeInTheDocument();
  });

  it('should not render elements when it is loading', () => {
    getRenderer({ loading: true });
    expect(queryByText(/rows per page:/i)).not.toBeInTheDocument();
    expect(queryByRole('combobox')).not.toBeInTheDocument();
    expect(queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call setPage when pagination action is clicked', async () => {
    const setPage = jest.fn();
    mockUsePagingInfo({ setPage });

    getRenderer({ hasNextPage: true });

    await userEvent.click(getByRole('button', { name: /next page/i }));
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('should call setPageSize when rows per page selector is changed', async () => {
    const setPageSize = jest.fn();
    mockUsePagingInfo({ setPageSize });

    getRenderer();

    await userEvent.selectOptions(getByRole('combobox'), '50');
    expect(setPageSize).toHaveBeenCalledWith(50);

    await userEvent.selectOptions(getByRole('combobox'), '75');
    expect(setPageSize).toHaveBeenCalledWith(75);

    expect(setPageSize).toHaveBeenCalledTimes(2);
  });
});

// Helpers
function getRenderer({
  hasNextPage = true,
  ...rest
}: Partial<ComponentProps<typeof WhyLabsTableSimplePagination>> = {}) {
  return render(
    <MemoryRouter>
      <MantineProvider>
        <table>
          <WhyLabsTableSimplePagination hasNextPage={hasNextPage} {...rest} />
        </table>
      </MantineProvider>
    </MemoryRouter>,
  );
}
