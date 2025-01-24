import { UserinfoResponse } from 'openid-client';

import {
  WHYLABS_OIDC_APP_METADATA_KEY,
  WHYLABS_OIDC_CONN_NAME,
  WHYLABS_OIDC_CONN_STRATEGY,
  WHYLABS_OIDC_ROLE_KEY,
  WHYLABS_OIDC_WHYLABS_ROLE_MAPPING,
} from '../constants';
import { Auth0AppMetadata, WhyLabsRole } from '../services/security/auth0-wrapper';

declare module 'openid-client' {
  interface OpenIDUser extends UserinfoResponse {
    [WHYLABS_OIDC_APP_METADATA_KEY]?: Auth0AppMetadata; // we no longer store userMetadata in auth0 app_metadata
    [WHYLABS_OIDC_ROLE_KEY]?: WhyLabsRole[];

    // role mapping from SAML, and info to identify the connection
    // This is used for just to do JIT provisioning/adding/removing users from groups
    [WHYLABS_OIDC_WHYLABS_ROLE_MAPPING]?: string[];
    [WHYLABS_OIDC_CONN_NAME]?: string;
    [WHYLABS_OIDC_CONN_STRATEGY]?: string;
  }
}
