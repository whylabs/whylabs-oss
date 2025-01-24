import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { mockUseGlobalDateRange } from 'hooks/mocks/mockUseGlobalDateRange';
import { getDaysBucketFromDateRange } from 'utils/dateUtils';
import { friendlyFormat } from 'utils/numberUtils';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GenericChartGrid } from '../GenericChartGrid';
import { GenericChartGridProps, GenericTimeseries, tickFormatter } from '../utils';

const { getByTestId, queryAllByText } = screen;

const TEST_ID = 'WhyLabsGenericChartGrid';

type TestDataShape = { timestamp: number; value: number };
type TestTooltipData = { label: string; value: number };
const getDate = (ts: TestDataShape) => new Date(ts.timestamp);
const translateTooltipData = (timestamp: number, data?: TestDataShape) => {
  return { label: `test-tooltip-${timestamp}`, value: data?.value ?? 0 };
};
const DEFAULT_HEIGHT = 140;
const DEFAULT_WIDTH = 300;

const DEFAULT_PROPS: GenericChartGridProps<GenericTimeseries<TestDataShape>, TestTooltipData> = {
  children: () => <>Test</>,
  data: [],
  getDate,
  height: DEFAULT_HEIGHT,
  maxYValue: 100,
  emptyProfileShape: { timestamp: 0, value: 0 },
  tooltipComponent: () => <>TOOLTIP</>,
  translateTooltipData,
  width: DEFAULT_WIDTH,
};

// 2023-03-21 00:00:00 (Brasilia Standard Time)
const FROM_TIMESTAMP = 1679367600000;
// 2023-03-28 00:00:00 (Brasilia Standard Time)
const TO_TIMESTAMP = 1679972400000;

beforeEach(() => {
  mockUseGlobalDateRange(FROM_TIMESTAMP, TO_TIMESTAMP);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('<GenericChartGrid />', () => {
  describe('Should correct render component', () => {
    it("should have default testid 'WhyLabsGenericChartGrid'", () => {
      getRenderer<TestDataShape, TestTooltipData>({ ...DEFAULT_PROPS, data: [{ timestamp: 0, value: 0 }] });
      expect(getByTestId(TEST_ID)).toBeInTheDocument();
    });
  });

  it.each([
    [FROM_TIMESTAMP, TO_TIMESTAMP],
    [1672542000000, 1672887600000],
    [1651806000000, 1652151600000],
  ])('Should have the correct date ticks for %p to %p timestamps', (from, to) => {
    mockUseGlobalDateRange(from, to);
    getRenderer<TestDataShape, TestTooltipData>({ ...DEFAULT_PROPS, data: [{ timestamp: 0, value: 0 }] });
    const dateTicks = getDaysBucketFromDateRange({
      from,
      to: to - 1,
    })?.map((d) => tickFormatter(d));
    dateTicks?.forEach((tick) => expect(queryAllByText(tick)[0]).toBeInTheDocument());
  });

  it.each([100, 200, 10000])('Should have the correct values on left axis with min of 0 and max of %p', (maxValue) => {
    getRenderer<TestDataShape, TestTooltipData>({
      ...DEFAULT_PROPS,
      maxYValue: maxValue,
      data: [{ timestamp: 0, value: 0 }],
    });
    expect(queryAllByText(0)[0]).toBeInTheDocument();
    expect(queryAllByText(friendlyFormat(maxValue))[0]).toBeInTheDocument();
  });
});

// Helpers
function getRenderer<DataShape, TooltipData>({
  ...rest
}: GenericChartGridProps<GenericTimeseries<DataShape>, TooltipData>) {
  return render(
    <MockedProvider>
      <RecoilRoot>
        <MemoryRouter>
          <GenericChartGrid {...rest} />
        </MemoryRouter>
      </RecoilRoot>
    </MockedProvider>,
  );
}
