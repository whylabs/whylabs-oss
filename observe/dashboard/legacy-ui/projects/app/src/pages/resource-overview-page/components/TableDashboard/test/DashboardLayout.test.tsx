import { render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { RecoilRoot } from 'recoil';
import { SortDirection } from 'generated/graphql';
import { data, queryMock, refetchData } from './mockData';
import DashboardLayout, {
  TABLE_DASHBOARD_CONTAINER_TEST_ID,
  SETUP_MODEL_BTN_TEST_ID,
  DashboardLayoutProps,
} from '../DashboardLayout';

describe('DashboardLayout', () => {
  it('Layout renders', () => {
    const { getByTestId } = render(
      <MockedProvider mocks={queryMock} addTypename={false}>
        <RecoilRoot>
          <DashboardLayout {...DEFAULT_PROPS} />
        </RecoilRoot>
      </MockedProvider>,
    );
    const tableRoot = getByTestId(TABLE_DASHBOARD_CONTAINER_TEST_ID);

    expect(tableRoot).toBeInTheDocument();
  });

  it('Has setup model button', () => {
    const { getByTestId } = render(
      <MockedProvider mocks={queryMock} addTypename={false}>
        <RecoilRoot>
          <DashboardLayout {...DEFAULT_PROPS} />
        </RecoilRoot>
      </MockedProvider>,
    );
    const setupButton = getByTestId(SETUP_MODEL_BTN_TEST_ID);

    expect(setupButton).toBeInTheDocument();
  });
});

const DEFAULT_PROPS: DashboardLayoutProps = {
  loading: false,
  models: data.models,
  refetchData,
  setIsOpen: () => {
    /** */
  },
  // error: {},
  searchTerm: 'text',
  handleSort: () => {
    /** */
  },
  sortDirection: SortDirection.Desc,
  userCanManageDatasets: true,
  sortBy: undefined,
};
