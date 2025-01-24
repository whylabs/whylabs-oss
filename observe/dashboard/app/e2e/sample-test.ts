/**
 * Sample script to demonstrate how auth + GraphQL queries might work in E2E tests
 * Run with `yarn ts-node sample-test.ts`
 * See here for more info: https://whylabs.atlassian.net/wiki/spaces/EN/pages/253034497/Authentication+scheme+and+Auth0#Testing-with-Auth0-users
 */

import fs from 'fs';

import fetch, { HeadersInit } from 'node-fetch';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
};

const getTokenResponse = async (): Promise<TokenResponse> => {
  const res = await fetch('https://auth.development.whylabsdev.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Replace USERNAME and PASSWORD with actual values for the user you are trying to log in as.
    // Replace CLIENT_ID and SECRET below with values from the Auth0 app you are trying to access (e.g. development stack)
    body: JSON.stringify({
      grant_type: 'password',
      username: 'USERNAME',
      password: 'PASSWORD',
      audience: 'https://observatory.development.whylabsdev.com',
      scope: 'openid',
      client_id: 'CLIENT_ID',
      client_secret: 'SECRET',
    }),
  });
  return res.json();
};

const queryDashbird = async (
  query: string,
  variables: object,
  token: string,
  targetOrgId: string | undefined = undefined,
): Promise<unknown> => {
  const dashbirdUrl = 'http://localhost:8080/graphql'; // change to the remote Dashbird endpoint if needed
  console.log('Sending query: ', query);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (targetOrgId) {
    headers['x-target-whylabs-org'] = targetOrgId;
  }

  const res = await fetch(dashbirdUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
};

const getUserQuery = async (): Promise<string> => {
  return fs.promises.readFile(`${__dirname}/getUser.graphql`, {}).then((f) => f.toString());
};

const runTest = async (): Promise<void> => {
  const res = await getTokenResponse();
  const token = res.access_token;
  console.log(res);

  const userQuery = await getUserQuery();
  const dashbirdResponse = await queryDashbird(userQuery, {}, token);
  console.log(JSON.stringify(dashbirdResponse, null, 2));
  const existenceQuery =
    'query getDataExistenceInformation($datasetId: String!) {\n  model(id: $datasetId) {\n    features {\n      name\n    }\n    outputs {\n      name\n    }\n    datasetMetrics {\n      name\n      metadata {\n        ...MetricSchemaFields\n      }\n    }\n    totalSegments\n    dataAvailability {\n      hasData\n      oldestTimestamp\n    }\n  }\n}\n\nfragment MetricSchemaFields on MetricSchema {\n  name\n  label\n  dataType\n  showAsPercent\n  unitInterval\n  metricDirection\n  metricKind\n  bounds {\n    upper\n    lower\n  }\n}';

  const resp2 = await queryDashbird(existenceQuery, { datasetId: 'model-4' }, token);
  console.log(JSON.stringify(resp2, null, 2));
};

runTest();
