import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { usePagingInfo, UsePagingInfoProps } from './usePagingInfo';
import { mockUseWhyLabsSnackbar } from './mocks/mockUseSnackbar';

const { getByTestId, getByText } = screen;

describe('usePagingInfo()', () => {
  beforeEach(() => {
    mockUseWhyLabsSnackbar();
  });

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

  it.each([2, 5])('should update location search string after changing page to %p', (customPage) => {
    const customLimit = 21;
    getRenderer({ customPage, customLimit });

    const expectedOffset = (customLimit * customPage).toString();

    userEvent.click(getByText('setPage'));
    expect(getByTestId('location.search')).toHaveTextContent(`?limit=${customLimit}&offset=${expectedOffset}`);
  });

  it.each([15, 50])('should update location search string after changing page size to %p', (customPageSize) => {
    getRenderer({ customPageSize });

    userEvent.click(getByText('setPageSize'));
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

  it.todo('should update pagingInfo when changing page');
  it.todo('should update pagingInfo when changing page size');
  it.todo('should change to default limit when handling a Dashbird PaginationLimitExceeded error');
  it.todo('should display a error snackbar when handling other errors');
});

// Helpers
type TestProps = UsePagingInfoProps & {
  customPage?: number;
  customPageSize?: number;
  initialEntries?: string[];
};
function getRenderer({ initialEntries, ...props }: TestProps = {}) {
  return render(
    <RecoilRoot>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="*" element={<TestComponent {...props} />} />
        </Routes>
      </MemoryRouter>
    </RecoilRoot>,
  );
}

function TestComponent({ customPage, customPageSize, ...rest }: TestProps) {
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
}
