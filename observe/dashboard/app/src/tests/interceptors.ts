import { dataServiceClient } from '../services/data/data-service/data-service-client-factory';
import { logServiceCall } from './call-logging';

const logAxiosError = (error: {
  request?: { path?: string };
  config?: { data?: string; url?: string };
  message?: string;
}) => {
  const parsedError = {
    path: error.request?.path,
    requestBody: error.config?.data ? JSON.parse(error?.config?.data) : undefined,
    error: error.message ?? `An error occurred: ${error}`,
  };
  const jsonMessage = JSON.stringify(parsedError);
  logServiceCall(jsonMessage, error.config?.url, 'dataService');
  logServiceCall(jsonMessage, error.config?.url, 'songbird');
  throw error;
};

if (process.env.ENABLE_CALL_LOG) {
  // These interceptors are sensitive to import order, which is why I havent pulled these into call-logging or
  // call-logging-fixtures and why these do not import axios; and to importing the same axios version as the songbird
  // and dataservice clients. If they stop working... thats probably why.
  dataServiceClient.axios.interceptors.request.use((config) => {
    // Insert logging code if needed
    return config;
  }, logAxiosError);

  dataServiceClient.axios.interceptors.response.use((response) => {
    const jsonMessage = JSON.stringify({
      path: response.request.path,
      requestBody: response.config.data ? JSON.parse(response.config.data) : undefined,
      axiosResponse: response.data,
      axiosStatus: response.status,
    });
    logServiceCall(jsonMessage, response.config.url, 'dataService');
    return response;
  }, logAxiosError);
}
