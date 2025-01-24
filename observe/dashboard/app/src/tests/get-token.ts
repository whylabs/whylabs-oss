/**
 * Get access token for test user
 * See here for more info: https://whylabs.atlassian.net/wiki/spaces/EN/pages/253034497/Authentication+scheme+and+Auth0#Testing-with-Auth0-users
 */

import fetch from 'node-fetch';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
};

// Note this access token approach is only enabled for local use
export const getUserAccessToken = async (
  email: string,
  password: string,
  clientId: string,
  clientSecret: string,
): Promise<string> => {
  const res = await fetch('https://auth.development.whylabsdev.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'password',
      username: email,
      password,
      audience: 'https://observatory.development.whylabsdev.com',
      scope: 'openid',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const resp: TokenResponse = await res.json();
  return resp.access_token;
};
