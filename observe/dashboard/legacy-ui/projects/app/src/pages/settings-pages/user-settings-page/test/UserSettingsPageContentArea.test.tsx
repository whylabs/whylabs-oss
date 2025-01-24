import { render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { LocalizationProvider } from '@material-ui/pickers';
import DateFnsUtils from '@material-ui/pickers/adapter/date-fns';
import { RecoilRoot } from 'recoil';
import { MemoryRouter } from 'react-router-dom';
import UserSettingsPageContentArea, {
  INVITE_USER_SECTION_TEST_ID,
  USER_TABLE_SECTOPM_TEST_ID,
} from '../UserSettingsPageContentArea';
import { queryMock } from './mockedData';

const WrappedUserSettingsPageContentArea = () => (
  <RecoilRoot>
    <MemoryRouter>
      <LocalizationProvider dateAdapter={DateFnsUtils}>
        <MockedProvider mocks={queryMock} addTypename={false}>
          <UserSettingsPageContentArea />
        </MockedProvider>
      </LocalizationProvider>
    </MemoryRouter>
  </RecoilRoot>
);

describe('UserSettingsPageContentArea', () => {
  it('Renders table section', () => {
    const { getByTestId } = render(<WrappedUserSettingsPageContentArea />);
    const usersTableSection = getByTestId(USER_TABLE_SECTOPM_TEST_ID);

    expect(usersTableSection).toBeInTheDocument();
  });

  it('Renders invite section', () => {
    const { getByTestId } = render(<WrappedUserSettingsPageContentArea />);

    const inviteSection = getByTestId(INVITE_USER_SECTION_TEST_ID);
    expect(inviteSection).toBeInTheDocument();
  });
});
