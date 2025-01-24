import { Configuration, AccountApi } from '@whylabs/songbird-node-client';
import axios from 'axios';

import { getOpenAPIClientConfig } from './openapi-client';

const songbirdEndpoint = process.env.SONGBIRD_API_ENDPOINT ?? 'https://songbird.development.whylabsdev.com';
// const songbirdEndpoint = process.env.SONGBIRD_API_ENDPOINT ?? 'http://localhost:8080';

const getClient = (config: Configuration) => {
  const axiosInstance = axios.create(config.baseOptions);

  return {
    accounts: new AccountApi(config, undefined, axiosInstance),
  };
};

export type SongbirdClient = ReturnType<typeof getClient>;

export const getSongbirdClient = (apiKey: string): SongbirdClient => {
  const config = new Configuration(getOpenAPIClientConfig(apiKey, songbirdEndpoint));
  return getClient(config);
};
