import { renderHook } from '@testing-library/react-hooks';
import { MembershipType } from 'generated/graphql';
import { setUseUserContextSpy } from 'hooks/mocks/mockUseUserContext';
import { useIsDemoOrg } from './useIsDemoOrg';

describe('useIsDemoOrg', () => {
  beforeEach(() => {
    setUseUserContextSpy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false if the user is not in a demo org', () => {
    setUseUserContextSpy({
      user: {
        organization: {
          membershipType: MembershipType.Standard,
        },
      },
    });

    const { result } = getHookRenderer();
    expect(result.current).toBe(false);
  });

  it('should return true if the user is in a demo org', () => {
    setUseUserContextSpy({
      user: {
        organization: {
          membershipType: MembershipType.Demo,
        },
      },
    });

    const { result } = getHookRenderer();
    expect(result.current).toBe(true);
  });
});

// Helpers
function getHookRenderer() {
  return renderHook(() => useIsDemoOrg());
}
