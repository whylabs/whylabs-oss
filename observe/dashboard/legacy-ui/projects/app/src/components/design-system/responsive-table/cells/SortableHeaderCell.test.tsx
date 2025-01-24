import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { SortDirection } from 'generated/graphql';
import SortableHeaderCell from './SortableHeaderCell';

const { getByRole } = screen;

const DEFAULT_BUTTON_LABEL = /click to sort/i;
const ASCENDING_BUTTON_LABEL = /sorted ascending/i;
const DESCENDING_BUTTON_LABEL = /sorted descending/i;
const ALPHABETICALLY_BUTTON_LABEL = /sorted alphabetically/i;

describe('<SortableHeaderCell />', () => {
  it('should render default button', () => {
    getRenderer({ sortDirection: undefined });
    expect(getByRole('button', { name: DEFAULT_BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should render default button when sort type is undefined and direction is Asc', () => {
    getRenderer({ sortDirection: SortDirection.Asc });
    expect(getByRole('button', { name: ASCENDING_BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should render default button when sort type is undefined and direction is Desc', () => {
    getRenderer({ sortDirection: SortDirection.Desc });
    expect(getByRole('button', { name: DESCENDING_BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should render correct button when sort type is number and direction is Asc', () => {
    getRenderer({ sortDirection: SortDirection.Asc, sortType: 'number' });
    expect(getByRole('button', { name: ASCENDING_BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should render correct button when sort type is number and direction is Desc', () => {
    getRenderer({ sortDirection: SortDirection.Desc, sortType: 'number' });
    expect(getByRole('button', { name: DESCENDING_BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should render correct button when sort type is text and direction is Asc', () => {
    getRenderer({ sortDirection: SortDirection.Asc, sortType: 'text' });
    expect(getByRole('button', { name: ALPHABETICALLY_BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should render correct button when sort type is text and direction is Desc', () => {
    getRenderer({ sortDirection: SortDirection.Desc, sortType: 'text' });
    expect(getByRole('button', { name: ALPHABETICALLY_BUTTON_LABEL })).toBeInTheDocument();
  });

  describe('onSortDirectionChange callback', () => {
    describe('sortType="text"', () => {
      it('should call it with Asc when clicked and no sort applied', () => {
        const onSortDirectionChange = jest.fn();
        getRenderer({ sortDirection: undefined, sortType: 'text', onSortDirectionChange });

        userEvent.click(getByRole('button', { name: DEFAULT_BUTTON_LABEL }));
        expect(onSortDirectionChange).toHaveBeenCalledWith(SortDirection.Asc);
      });

      it('should call it with Desc when clicked and sort is Asc', () => {
        const onSortDirectionChange = jest.fn();
        getRenderer({ sortDirection: SortDirection.Asc, sortType: 'text', onSortDirectionChange });

        userEvent.click(getByRole('button', { name: ALPHABETICALLY_BUTTON_LABEL }));
        expect(onSortDirectionChange).toHaveBeenCalledWith(SortDirection.Desc);
      });

      it('should call it with undefined when clicked and sort is Desc', () => {
        const onSortDirectionChange = jest.fn();
        getRenderer({ sortDirection: SortDirection.Desc, sortType: 'text', onSortDirectionChange });

        userEvent.click(getByRole('button', { name: ALPHABETICALLY_BUTTON_LABEL }));
        expect(onSortDirectionChange).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('sortType="number"', () => {
    it('should call it with Desc when clicked and no sort applied', () => {
      const onSortDirectionChange = jest.fn();
      getRenderer({ sortDirection: undefined, sortType: 'number', onSortDirectionChange });

      userEvent.click(getByRole('button', { name: DEFAULT_BUTTON_LABEL }));
      expect(onSortDirectionChange).toHaveBeenCalledWith(SortDirection.Desc);
    });

    it('should call it with Asc when clicked and sort is Desc', () => {
      const onSortDirectionChange = jest.fn();
      getRenderer({ sortDirection: SortDirection.Desc, sortType: 'number', onSortDirectionChange });

      userEvent.click(getByRole('button', { name: DESCENDING_BUTTON_LABEL }));
      expect(onSortDirectionChange).toHaveBeenCalledWith(SortDirection.Asc);
    });

    it('should call it with undefined when clicked and sort is Asc', () => {
      const onSortDirectionChange = jest.fn();
      getRenderer({ sortDirection: SortDirection.Asc, sortType: 'number', onSortDirectionChange });

      userEvent.click(getByRole('button', { name: ASCENDING_BUTTON_LABEL }));
      expect(onSortDirectionChange).toHaveBeenCalledWith(undefined);
    });
  });
});

// Helpers
type Props = ComponentProps<typeof SortableHeaderCell>;
function getRenderer({
  children = 'The children',
  sortDirection = undefined,
  onSortDirectionChange = jest.fn(),
  ...rest
}: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <SortableHeaderCell {...rest} onSortDirectionChange={onSortDirectionChange} sortDirection={sortDirection}>
        {children}
      </SortableHeaderCell>
    </MantineProvider>,
  );
}
