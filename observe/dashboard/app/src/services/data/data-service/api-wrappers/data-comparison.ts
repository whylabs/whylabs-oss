import { DataEvaluationRequest, DataEvaluationResponse } from '@whylabs/data-service-node-client';

import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';

export const fetchEvaluationTable = async (
  orgId: string,
  params: DataEvaluationRequest,
  options?: CallOptions,
): Promise<DataEvaluationResponse> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const response = await tryCall(() => client.metrics.dataEvaluation(orgId, params, axiosCallConfig(options)), options);
  return response.data;
};
