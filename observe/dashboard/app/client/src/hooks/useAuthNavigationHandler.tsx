import { clearHeapSession } from '~/telemetry';
import { DASHBIRD_URI } from '~/utils/constants';
import { BASE_LOGIN_URI, BASE_LOGOUT_URI, SILENT_LOGIN_URI } from '~server/constants';

type LoginOptions = {
  // if true, user will be redirected back to their original location in the app after logging in
  preserveLocation?: boolean;
};

export function useAuthNavigationHandler() {
  return {
    triggerLogin: (opts?: LoginOptions) => {
      const loginUri = `${DASHBIRD_URI}/${BASE_LOGIN_URI}`;
      const { preserveLocation } = opts ?? {};

      // must trigger browser navigation to the login url for it to work properly
      window.location.href = preserveLocation
        ? `${loginUri}?redirectUri=${encodeURIComponent(window.location.href)}`
        : loginUri;
    },
    triggerSilentLogin: () => {
      const loginUri = `${DASHBIRD_URI}/${SILENT_LOGIN_URI}`;

      // must trigger browser navigation to the login url for it to work properly
      window.location.href = loginUri;
    },
    triggerLogout: () => {
      const logoutUri = `${DASHBIRD_URI}/${BASE_LOGOUT_URI}`;

      // pre-logout housekeeping
      clearHeapSession();

      // must trigger browser navigation to the logout url for it to work properly
      window.location.href = logoutUri;
    },
  };
}
