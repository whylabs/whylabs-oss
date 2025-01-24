import { WriteStream, createWriteStream } from 'fs';

import { config } from '../config';

const services = ['dataService', 'songbird'] as const;
type Service = (typeof services)[number];
type CallStreamMap = { [key in Service]?: WriteStream };
const callStreams: CallStreamMap = {};

/**
 * Set env variable ENABLE_CALL_LOG to turn on call logging. This will log calls to the services above, into files
 * <service>calls.log as jsonlines. Context lines tracking the test and graphql query will also be logged.
 * For example:
 * {"test":"Migration test queries vs expected results tests for model-2 (Regression model) should match expected for GetModelPerformance"}
 * {"graphqlQuery":"Starting getModelPerformance"}
 * {"path":"/profiles/timeBoundary","axiosResponse":{"rows":[{"start":1670889600000,"end":1671451200000,"datasetId":"model-2"}]},"axiosStatus":200}
 * {"path":"/profiles/regressionMetrics","axiosResponse":[],"axiosStatus":200}
 * {"path":"/profiles/maxio","axiosResponse":[],"axiosStatus":200}
 * {"path":"/profiles/classificationSummary","axiosResponse":[],"axiosStatus":200}
 * {"graphqlQuery":"Finished getModelPerformance"}
 */

// Keep this commented out in checkedin code
// process.env.ENABLE_CALL_LOG = 'true';
if (process.env.ENABLE_CALL_LOG) {
  services.forEach((service) => {
    callStreams[service] = createWriteStream(`${service.toLowerCase()}calls.log`, { flags: 'a' });
  });
}

export const logToAllCallStreams = (jsonMessage: string): void => {
  if (process.env.ENABLE_CALL_LOG) {
    Object.values(callStreams).forEach((stream) => stream?.write(jsonMessage + '\n'));
  }
};

export const logServiceCall = (jsonMessage: string, url: string | undefined, service: Service): void => {
  if (url && url.startsWith(config[service]?.endpoint ?? '') && callStreams[service]) {
    callStreams[service]?.write(jsonMessage + '\n');
  }
};
