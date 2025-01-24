import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useComposedFilter } from '~/hooks/composed-filter/useComposedFilter';

import { CustomComposedFilters, CustomComposedFiltersProps } from './CustomComposedFilters';

const { getByRole, queryByRole } = screen;

describe('CustomComposedFilters', () => {
  it('should render without crashing', () => {
    const { container } = getRenderer();
    expect(container).toBeInTheDocument();
  });

  it('should not render dropdown by default', () => {
    getRenderer();
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should toggle dropdown on button click', async () => {
    getRenderer();
    await userEvent.click(getByRole('button', { name: /no filters applied/i }));
    expect(getByRole('dialog')).toBeInTheDocument();
  });
});

// Test helpers
function getRenderer({
  composedFilterViewModel,
  createListDisplayName = (values: string[]) => `any of ${values.length} selected`,
  convertListValueToReadableName = (value: string) => value,
  getListFilterOptionsFor = () => [],
}: Partial<CustomComposedFiltersProps> = {}) {
  return render(
    <MantineProvider>
      <p>outside content</p>
      <CustomComposedFilters
        composedFilterViewModel={composedFilterViewModel || mockUseComposedFilters()}
        createListDisplayName={createListDisplayName}
        convertListValueToReadableName={convertListValueToReadableName}
        getListFilterOptionsFor={getListFilterOptionsFor}
      />
    </MantineProvider>,
  );
}

type HookReturnType = ReturnType<typeof useComposedFilter>;

export function mockUseComposedFilters(props: Partial<HookReturnType> = {}): HookReturnType {
  return {
    addFilter: jest.fn(),
    clear: jest.fn(),
    debouncedReadyToQueryFilters: [],
    deleteFilter: jest.fn(),
    dimensionOptions: [],
    filters: [],
    isLoadingFilters: false,
    hideConditionSelection: false,
    onChangeCondition: jest.fn(),
    onChangeDimension: jest.fn(),
    onChangeValue: jest.fn(),
    onChangeWholeFilter: jest.fn(),
    onChangeConditionAndValue: jest.fn(),
    readyToQueryFilters: [],
    ...props,
  };
}
