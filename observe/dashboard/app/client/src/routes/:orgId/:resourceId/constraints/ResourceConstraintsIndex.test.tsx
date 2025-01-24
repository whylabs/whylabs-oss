import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TestWrapper } from '~/components/test/TestWrapper';
import { mockUseResourceBatchFrequency } from '~/hooks/mocks/mockUseResourceBatchFrequency';
import {
  LIMIT_QUERY_NAME,
  OFFSET_QUERY_NAME,
  SELECTED_CONSTRAINT_QUERY_NAME,
  SELECTED_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { trpcMsw } from '~/utils/trpcMswClient';
import { ValidConstraint } from '~server/trpc/dashboard/constraints';
import { setupServer } from 'msw/node';
import { createMemoryRouter, useLocation } from 'react-router-dom';

import { ResourceConstraintsIndex } from './ResourceConstraintsIndex';
import { loader } from './useResourceConstraintsViewModel';

const { getByRole, getByTestId, findByTestId, findByText, queryByRole, queryByText } = screen;

const FAILED_CONSTRAINTS_LABEL = 'Failed constraints';
const HEALTHY_CONSTRAINTS_LABEL = 'Healthy constraints';
const EMPTY_STATE_MESSAGE = 'This resource has no constraints';

const FAILED_CONSTRAINTS = [
  createConstraint({
    displayName: 'Failed 1',
    id: 'failed-1',
    anomaliesCount: 5,
  }),
  createConstraint({
    displayName: 'Failed 2',
    id: 'failed-2',
    anomaliesCount: 15,
  }),
];

export const mockTrpcServer = setupServer(
  trpcMsw.dashboard.constraints.list.query((_, res, ctx) =>
    res(ctx.data({ segmentConstraints: [], totalResourceConstraints: 0 })),
  ),
  trpcMsw.analysis.analyzerResults.getAnomaliesCount.query((_, res, ctx) => res(ctx.data([]))),
);

jest.mock('~/components/empty-state/components/CodeBlock', () => ({
  CodeBlock: () => <div>CodeBlock</div>,
}));

jest.mock('~/components/chart/TimeSeriesChart', () => ({
  TimeSeriesChart: () => <div data-testid="TimeSeriesChart">TimeSeriesChart</div>,
}));

describe('<ResourceConstraintsIndex />', () => {
  beforeAll(() => {
    // Establish requests interception layer before all tests.
    mockTrpcServer.listen({
      // Disable msw warnings
      onUnhandledRequest: 'bypass',
    });
  });

  beforeEach(() => {
    mockUseResourceBatchFrequency();

    // Reset any runtime request handlers we may add during the tests.
    mockTrpcServer.resetHandlers();
  });

  afterAll(() => {
    jest.restoreAllMocks();

    // Clean up after all tests are done, preventing this
    // interception layer from affecting irrelevant tests.
    mockTrpcServer.close();
  });

  it('should display loading overlay', async () => {
    getRenderer();
    expect(await findByTestId('WhyLabsLoadingOverlay')).toBeInTheDocument();
  });

  it("should display 'No constraints' message", async () => {
    getRenderer();
    expect(await findByText(EMPTY_STATE_MESSAGE)).toBeInTheDocument();
  });

  it('should not render filter input before loading content', () => {
    getRenderer();
    expect(queryByRole('textbox', { name: /filter/i })).not.toBeInTheDocument();
  });

  describe('when there is constraints', () => {
    beforeEach(() => {
      mockTrpcServer.use(
        trpcMsw.dashboard.constraints.list.query((_, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.data({
              segmentConstraints: [
                createConstraint({
                  displayName: 'test',
                  id: 'testid',
                  anomaliesCount: 0,
                }),
              ],
              totalResourceConstraints: 1,
            }),
          );
        }),
        trpcMsw.analysis.analyzerResults.getAnomaliesCount.query((_, res, ctx) => res(ctx.data([]))),
      );
    });

    it('should render filter input', async () => {
      getRenderer();
      await waitUntilContentLoad();

      expect(getByRole('textbox', { name: /filter/i })).toBeInTheDocument();
    });

    it('should display constraints', async () => {
      getRenderer();
      await waitUntilContentLoad();

      expect(queryByText(EMPTY_STATE_MESSAGE)).not.toBeInTheDocument();
      expect(getByRole('button', { name: `${FAILED_CONSTRAINTS_LABEL} (0)` })).toBeInTheDocument();
      expect(getByRole('button', { name: `${HEALTHY_CONSTRAINTS_LABEL} (1)` })).toBeInTheDocument();
    });
  });

  it('should display correct count on sidebar', async () => {
    mockTrpcServer.use(
      trpcMsw.dashboard.constraints.list.query((_, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.data({
            segmentConstraints: [
              createConstraint({
                displayName: 'failed 1',
                id: 'failed-1',
                anomaliesCount: 5,
              }),
              createConstraint({
                displayName: 'failed 2',
                id: 'failed-2',
                anomaliesCount: 2,
              }),
              createConstraint({
                displayName: 'healthy',
                id: 'healthy',
                anomaliesCount: 0,
              }),
            ],
            totalResourceConstraints: 3,
          }),
        );
      }),
      trpcMsw.analysis.analyzerResults.getAnomaliesCount.query((_, res, ctx) => res(ctx.data([]))),
    );

    getRenderer();
    await waitUntilContentLoad();

    expect(getByRole('button', { name: `${FAILED_CONSTRAINTS_LABEL} (2)` })).toBeInTheDocument();
    expect(getByRole('button', { name: `${HEALTHY_CONSTRAINTS_LABEL} (1)` })).toBeInTheDocument();
  });

  it('should display failed constraints on sidebar as buttons', async () => {
    const list = [
      createConstraint({
        displayName: 'Failed A',
        id: 'failed-a',
        anomaliesCount: 23,
      }),
      createConstraint({
        displayName: 'Failed B',
        id: 'failed-b',
        anomaliesCount: 89,
      }),
      createConstraint({
        displayName: 'Failed C',
        id: 'failed-c',
        anomaliesCount: 11,
      }),
    ];

    mockTrpcServer.use(
      trpcMsw.dashboard.constraints.list.query((_, res, ctx) =>
        res.once(
          ctx.data({
            segmentConstraints: list,
            totalResourceConstraints: 3,
          }),
        ),
      ),
    );

    getRenderer();
    await waitUntilContentLoad();

    list.forEach((c) => {
      expect(getByRole('button', { name: `${c.displayName} ${c.anomaliesCount}` })).toBeInTheDocument();
    });
  });

  it('should display no failed constraints message when there are no failed constraints', async () => {
    mockTrpcServer.use(
      trpcMsw.dashboard.constraints.list.query((_, res, ctx) =>
        res.once(
          ctx.data({
            segmentConstraints: [
              createConstraint({
                displayName: 'Healthy',
                id: 'healthy',
                anomaliesCount: 0,
              }),
            ],
            totalResourceConstraints: 1,
          }),
        ),
      ),
    );

    getRenderer();
    await waitUntilContentLoad();

    const failedConstraintsButton = getByRole('button', { name: `${FAILED_CONSTRAINTS_LABEL} (0)` });

    expect(failedConstraintsButton).toBeInTheDocument();
    expect(getByRole('button', { name: `${HEALTHY_CONSTRAINTS_LABEL} (1)` })).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(within(failedConstraintsButton.parentElement!).getByText(/no failed constraints/i)).toBeInTheDocument();
  });

  it('should display no healthy constraints message when there are no healthy constraints', async () => {
    mockTrpcServer.use(
      trpcMsw.dashboard.constraints.list.query((_, res, ctx) =>
        res.once(
          ctx.data({
            segmentConstraints: [
              createConstraint({
                displayName: 'Failed',
                id: 'failed',
                anomaliesCount: 5,
              }),
            ],
            totalResourceConstraints: 1,
          }),
        ),
      ),
    );

    getRenderer();
    await waitUntilContentLoad();

    const healthyConstraintsButton = getByRole('button', { name: `${HEALTHY_CONSTRAINTS_LABEL} (0)` });

    expect(getByRole('button', { name: `${FAILED_CONSTRAINTS_LABEL} (1)` })).toBeInTheDocument();
    expect(healthyConstraintsButton).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(within(healthyConstraintsButton.parentElement!).getByText(/no healthy constraints/i)).toBeInTheDocument();
  });

  describe('callback', () => {
    beforeEach(() => {
      mockTrpcServer.use(
        trpcMsw.dashboard.constraints.list.query((_, res, ctx) =>
          res.once(
            ctx.data({
              segmentConstraints: FAILED_CONSTRAINTS,
              totalResourceConstraints: FAILED_CONSTRAINTS.length,
            }),
          ),
        ),
      );
    });

    it('should select failed constraint', async () => {
      const list = FAILED_CONSTRAINTS;
      getRenderer();
      await waitUntilContentLoad();

      await userEvent.click(getByRole('button', { name: `${list[0].displayName} ${list[0].anomaliesCount}` }));
      expect(getByTestId('location.search')).toHaveTextContent(`${SELECTED_CONSTRAINT_QUERY_NAME}=${list[0].id}`);

      await userEvent.click(getByRole('button', { name: `${list[1].displayName} ${list[1].anomaliesCount}` }));
      expect(getByTestId('location.search')).toHaveTextContent(`${SELECTED_CONSTRAINT_QUERY_NAME}=${list[1].id}`);
    });

    it('should remove selected search param when a constraint is selected', async () => {
      const list = FAILED_CONSTRAINTS;
      getRenderer({ searchParams: `${SELECTED_CONSTRAINT_QUERY_NAME}=${list[0].id}&${SELECTED_QUERY_NAME}=whatever` });

      await waitUntilContentLoad();
      expect(getByTestId('location.search')).toHaveTextContent(`${SELECTED_QUERY_NAME}=whatever`);

      await userEvent.click(getByRole('button', { name: `${list[1].displayName} ${list[1].anomaliesCount}` }));
      expect(getByTestId('location.search')).not.toHaveTextContent(`${SELECTED_QUERY_NAME}=`);
    });

    it('should set offset to zero when a constraint is selected', async () => {
      const list = FAILED_CONSTRAINTS;
      getRenderer({
        searchParams: `${SELECTED_CONSTRAINT_QUERY_NAME}=${list[0].id}&${OFFSET_QUERY_NAME}=1&${LIMIT_QUERY_NAME}=1`,
      });

      await waitUntilContentLoad();
      expect(getByTestId('location.search')).toHaveTextContent(`${OFFSET_QUERY_NAME}=1`);

      await userEvent.click(getByRole('button', { name: `${list[1].displayName} ${list[1].anomaliesCount}` }));
      expect(getByTestId('location.search')).toHaveTextContent(`${OFFSET_QUERY_NAME}=0`);
    });
  });
});

// Helpers
function getRenderer({ searchParams }: { searchParams?: string } = {}) {
  const routes = [
    {
      path: '/:orgId/:resourceId/constraints',
      element: <TestComponent />,
      loader,
    },
  ];

  const router = createMemoryRouter(routes, {
    initialEntries: [`/org-test/model-test/constraints${searchParams ? `?${searchParams}` : ''}`],
  });

  return render(<TestWrapper router={router} />);
}

function createConstraint(props: Partial<ValidConstraint>): ValidConstraint {
  return {
    anomaliesCount: 0,
    constraintDefinition: '',
    config: {},
    displayName: 'Constraint',
    metricName: null,
    id: 'testid',
    ...props,
  };
}

async function waitUntilContentLoad() {
  return expect(await findByTestId('ResourceConstraintsContent')).toBeInTheDocument();
}

const TestComponent = () => {
  const { search } = useLocation();

  return (
    <>
      <ResourceConstraintsIndex />
      <p data-testid="location.search">{search}</p>
    </>
  );
};
