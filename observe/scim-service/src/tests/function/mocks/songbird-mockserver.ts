import { SetupServer, setupServer } from 'msw/node';
import { handlers, basePath } from './handlers';

export const setupMockServer = async (scenario = 'default'): Promise<SetupServer> => {
  return setupServer(...handlers(scenario));
};

export const songbirdBasePath = basePath;
