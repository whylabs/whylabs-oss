import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhyLabsTextInput } from '~/components/design-system';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import useSearchText from '../useSearchText';

const { getByRole, getByTestId } = screen;

describe('useSearchText()', () => {
  it('should return empty text as default', () => {
    getRenderer({ initialEntries: ['/test'] });
    expect(getByTestId('searchText')).toHaveTextContent('');
  });
  it('should return empty text when search url param is empty', () => {
    getRenderer({ initialEntries: ['/test&search='] });
    expect(getByTestId('searchText')).toHaveTextContent('');
  });

  it.each(['hello', 'world'])('should return search text %p', (expected) => {
    getRenderer({ initialEntries: [`/test?search=${expected}`] });
    expect(getByTestId('searchText')).toHaveTextContent(expected);
  });

  it('should update location search param', async () => {
    getRenderer({ initialEntries: ['/test?search=something'] });
    expect(getByTestId('location.search')).toHaveTextContent('search=something');

    const input = getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'hello');
    expect(getByTestId('location.search')).toHaveTextContent('search=hello');
  });

  it('should remove location search param', async () => {
    getRenderer({ initialEntries: ['/test?search=anything'] });
    expect(getByTestId('location.search')).toHaveTextContent('search=anything');

    const input = getByRole('textbox');
    await userEvent.clear(input);
    expect(getByTestId('location.search')).not.toHaveTextContent('search=anything');
  });

  it.each(['something', 'other'])('should update search text %p', async (expected) => {
    getRenderer();
    const input = getByRole('textbox');
    expect(input).toHaveValue('');

    await userEvent.type(input, expected);
    expect(getByTestId('searchText')).toHaveTextContent(expected);
  });

  it("should debounce search text update, so it doesn't update on every key stroke", async () => {
    getRenderer();
    const input = getByRole('textbox');
    expect(input).toHaveValue('');

    await userEvent.type(input, 'something');
    expect(getByTestId('searchText')).toHaveTextContent('something');
    expect(getByTestId('debouncedSearchText')).toHaveTextContent('');

    await userEvent.type(input, ' else');
    expect(getByTestId('searchText')).toHaveTextContent('something else');
    expect(getByTestId('debouncedSearchText')).toHaveTextContent('');

    // Wait for debounce
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    });
    expect(getByTestId('debouncedSearchText')).toHaveTextContent('something else');
  });
});

// Helpers
function getRenderer({
  initialEntries,
}: {
  initialEntries?: string[];
} = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="*" element={<TestComponent />} />
      </Routes>
    </MemoryRouter>,
  );
}

const TestComponent = () => {
  const { search } = useLocation();
  const { debouncedSearchText, searchText, setSearchText } = useSearchText();

  return (
    <>
      <WhyLabsTextInput label="Search" onChange={setSearchText} value={searchText} />
      <p data-testid="location.search">{search}</p>
      <p data-testid="debouncedSearchText">{debouncedSearchText}</p>
      <p data-testid="searchText">{searchText}</p>
    </>
  );
};
