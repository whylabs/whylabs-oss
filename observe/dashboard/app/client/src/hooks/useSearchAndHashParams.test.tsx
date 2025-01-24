import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { SetSearchParamsFn, useSearchAndHashParams } from './useSearchAndHashParams';

const { getByRole, getByTestId } = screen;

describe('useSearchAndHashParams()', () => {
  it('should return search params', () => {
    getRenderer({ initialEntries: ['/test?foo=bar&something=123'] });
    expect(getByTestId('searchParams')).toHaveTextContent('foo=bar&something=123');
  });

  it('should return hash params', () => {
    getRenderer({ initialEntries: ['/test?foo=bar#something=abc'] });
    expect(getByTestId('location.hash')).toHaveTextContent('something=abc');
    expect(getByTestId('searchParams')).toHaveTextContent('foo=ba');
  });

  it('should change search params keeping hash params intact', async () => {
    getRenderer({
      initialEntries: ['/test?foo=bar&something=123#selected=123'],
      nextInit: (nextSearchParams) => {
        nextSearchParams.set('something', 'abc');
        return nextSearchParams;
      },
    });

    await userEvent.click(getByRole('button'));
    expect(getByTestId('searchParams')).toHaveTextContent('foo=bar&something=abc');
    expect(getByTestId('location.hash')).toHaveTextContent('selected=123');
  });

  it('should change both search and hash params', async () => {
    getRenderer({
      initialEntries: ['/test?foo=bar&something=123#selected=123'],
      nextInit: (nextSearchParams) => {
        nextSearchParams.set('foo', 'lorem');
        nextSearchParams.delete('something');
        return nextSearchParams;
      },
      options: { hash: '' },
    });

    await userEvent.click(getByRole('button'));
    expect(getByTestId('searchParams')).toHaveTextContent('foo=lorem');
    expect(getByTestId('location.hash')).toHaveTextContent('');
  });

  it('should change both search and hash params with a new hash', async () => {
    getRenderer({
      initialEntries: ['/test?foo=bar&something=123#selected=123'],
      nextInit: (nextSearchParams) => {
        nextSearchParams.set('foo', 'lorem');
        nextSearchParams.delete('something');
        return nextSearchParams;
      },
      options: { hash: 'new-hash' },
    });

    await userEvent.click(getByRole('button'));
    expect(getByTestId('searchParams')).toHaveTextContent('foo=lorem');
    expect(getByTestId('location.hash')).toHaveTextContent('new-hash');
  });

  it('should change search params and remove hash', async () => {
    getRenderer({
      initialEntries: ['/test?foo=bar&something=123#selected=123'],
      nextInit: (nextSearchParams) => {
        nextSearchParams.set('foo', 'lorem');
        nextSearchParams.delete('something');
        return nextSearchParams;
      },
      options: { preserveHash: false },
    });

    await userEvent.click(getByRole('button'));
    expect(getByTestId('searchParams')).toHaveTextContent('foo=lorem');
    expect(getByTestId('location.hash')).toHaveTextContent('');
  });
});

// Helpers
type ComponentProps = {
  nextInit?: Parameters<SetSearchParamsFn>[0];
  options?: Parameters<SetSearchParamsFn>[1];
};

function getRenderer({
  initialEntries,
  nextInit,
  options,
}: ComponentProps & {
  initialEntries?: string[];
} = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="*" element={<TestComponent nextInit={nextInit} options={options} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const TestComponent = ({ nextInit, options }: ComponentProps) => {
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchAndHashParams();

  return (
    <>
      <p data-testid="location.hash">{hash}</p>
      <p data-testid="searchParams">{searchParams.toString()}</p>
      <button type="button" onClick={onClick}>
        Click me
      </button>
    </>
  );

  function onClick() {
    if (!nextInit) return;

    setSearchParams(nextInit, options);
  }
};
