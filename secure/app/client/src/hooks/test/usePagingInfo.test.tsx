import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { UsePagingInfoProps, usePagingInfo } from '../usePagingInfo';

const { getByTestId, getByText } = screen;

describe('usePagingInfo()', () => {
  it('should return default paging info', () => {
    getRenderer();

    expect(getByTestId('pagingInfo.limit')).toHaveTextContent('30');
    expect(getByTestId('pagingInfo.offset')).toHaveTextContent('0');
    expect(getByTestId('pagingInfo.page')).toHaveTextContent('0');
  });

  it.each([
    { customLimit: 20, customOffset: 30, page: 1 },
    { customLimit: 5, customOffset: 50, page: 10 },
  ])('should return custom paging info %p', (props) => {
    getRenderer(props);

    expect(getByTestId('pagingInfo.limit')).toHaveTextContent(props.customLimit.toString());
    expect(getByTestId('pagingInfo.offset')).toHaveTextContent(props.customOffset.toString());
    expect(getByTestId('pagingInfo.page')).toHaveTextContent(props.page.toString());
  });

  it.each([2, 5])('should update search string after changing page to %p', async (customPage) => {
    const customLimit = 21;
    getRenderer({ customPage, customLimit });

    const expectedOffset = (customLimit * customPage).toString();

    await userEvent.click(getByText('setPage'));
    expect(getByTestId('location.search')).toHaveTextContent(`?limit=${customLimit}&offset=${expectedOffset}`);
  });

  it.each([15, 50])('should update search string after changing page size to %p', async (customPageSize) => {
    getRenderer({ customPageSize });

    await userEvent.click(getByText('setPageSize'));
    expect(getByTestId('location.search')).toHaveTextContent(`?limit=${customPageSize}&offset=0`);
  });

  it.each([
    ['15', '45', '3'],
    ['50', '100', '2'],
  ])(
    'should return correct pagingInfo based on location search string with limit %i and offset %i',
    (limit, offset, page) => {
      getRenderer({ initialEntries: [`/test?limit=${limit}&offset=${offset}`] });

      expect(getByTestId('pagingInfo.limit')).toHaveTextContent(limit);
      expect(getByTestId('pagingInfo.offset')).toHaveTextContent(offset);
      expect(getByTestId('pagingInfo.page')).toHaveTextContent(page);
    },
  );

  it.each([2, 3])('should update pagingInfo when changing page to %p', async (customPage) => {
    const limit = 15;

    getRenderer({ customPage, initialEntries: [`/test?limit=${limit}&offset=45`] });

    await userEvent.click(getByText('setPage'));
    expect(getByTestId('pagingInfo.limit')).toHaveTextContent(limit.toString());
    expect(getByTestId('pagingInfo.offset')).toHaveTextContent((customPage * limit).toString());
    expect(getByTestId('pagingInfo.page')).toHaveTextContent(customPage.toString());
  });

  it.each([20, 40])('should update pagingInfo when changing page size to %p', async (customPageSize) => {
    const limit = 100;
    getRenderer({ customPageSize, initialEntries: [`/test?limit=${limit}&offset=20`] });

    await userEvent.click(getByText('setPageSize'));
    expect(getByTestId('pagingInfo.limit')).toHaveTextContent(customPageSize.toString());
  });
});

// Helpers
type TestProps = UsePagingInfoProps & {
  customPage?: number;
  customPageSize?: number;
  initialEntries?: string[];
};
function getRenderer({ initialEntries, ...props }: TestProps = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="*" element={<TestComponent {...props} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const TestComponent = ({ customPage, customPageSize, ...rest }: TestProps) => {
  const { search } = useLocation();
  const { pagingInfo, page, setPage, setPageSize } = usePagingInfo(rest);

  return (
    <div>
      <p data-testid="location.search">{search}</p>
      <p data-testid="pagingInfo.limit">{pagingInfo.limit}</p>
      <p data-testid="pagingInfo.offset">{pagingInfo.offset}</p>
      <p data-testid="pagingInfo.page">{page}</p>
      <button type="button" onClick={() => setPage(customPage ?? 1)}>
        setPage
      </button>
      <button type="button" onClick={() => setPageSize(customPageSize ?? 10)}>
        setPageSize
      </button>
    </div>
  );
};
