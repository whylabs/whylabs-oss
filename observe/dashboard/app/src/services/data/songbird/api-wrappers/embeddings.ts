import {
  EmbeddingsFilterRequest,
  TraceEmbeddingsCategoryDataset,
  TraceEmbeddingsRequest,
  TraceEmbeddingsResponse,
} from '@whylabs/data-service-node-client';
import { GetEmbeddingTextResponse } from '@whylabs/songbird-node-client';
import { isObject } from 'lodash';
import fetch from 'node-fetch';

import { CallOptions, axiosCallConfig } from '../../../../util/async-helpers';
import { dataServiceClient } from '../../data-service/data-service-client-factory';
import { getInterval } from '../../data-service/data-service-utils';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryGetMetadata } from './utils';

export const getWhyLabsEmbeddingsContent = async (
  uids: string[],
  options?: CallOptions,
): Promise<GetEmbeddingTextResponse | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  return tryGetMetadata(
    () => client.embeddings.retrieveEmbeddingText({ uids }, axiosCallConfig(options)),
    true,
    options?.context,
  );
};

export const getWhyLabsDatasetsSignedURL = async (
  dataTag?: string,
  version?: number,
  options?: CallOptions,
): Promise<string | undefined> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryGetMetadata(
    () => client.embeddings.getEmbeddingData(dataTag, version, axiosCallConfig(options)),
    true,
    options?.context,
  );
  return response?.url;
};

export type EmbeddingsSeries = {
  x: number[]; // the PCA x coordinates e.g. [x1, x2, x3, ...]
  y: number[]; // the PCA y coordinates e.g. [y1, y2, y3, ...]
  z: number[]; // the PCA z coordinates e.g. [z1, z2, z3, ...]
  text?: string[] | null; // This would be undefined for traces embeddings. For WhyLabs datasets, we will not display all the texts, so either empty string or undefined would works e.g. ['Hello doctor...', '']
};

export type TracesEmbeddingsSeries = TraceEmbeddingsCategoryDataset;

export const getWhyLabsDatasetsEmbeddingsData = async (
  dataTag?: string,
  version?: number,
  options?: CallOptions,
): Promise<[string, EmbeddingsSeries][]> => {
  const url = await getWhyLabsDatasetsSignedURL(dataTag, version, options);
  if (!url) return [];
  try {
    const data = await fetch(url, { method: 'GET' });
    const response = await data?.json();
    return processWhyLabsDatasetsData(Object.entries(response));
  } catch (e) {
    logger.error(e, 'Error trying to parse whylabs embeddings datasets');
    return [];
  }
};

const processWhyLabsDatasetsData = (data: [string, unknown][]): [string, EmbeddingsSeries][] => {
  return data.flatMap(([dataset, series]) => {
    if (isObject(series) && 'x' in series && 'y' in series && 'z' in series) {
      return [[dataset, series] as [string, EmbeddingsSeries]];
    }
    return [];
  });
};

type GetTracesEmbeddingsDataRequest = Omit<TraceEmbeddingsRequest, 'interval'> & {
  dateRange: { fromTimestamp: number; toTimestamp: number | null | undefined };
};
export const getTracesEmbeddingsData = (
  params: GetTracesEmbeddingsDataRequest,
  options?: CallOptions,
): Promise<TraceEmbeddingsResponse | null> => {
  const { dateRange, ...rest } = params;
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const request: TraceEmbeddingsRequest = {
    interval: getInterval(dateRange.fromTimestamp, dateRange.toTimestamp),
    ...rest,
  };
  return tryGetMetadata(() => client.traces.traceEmbeddings(request, axiosCallConfig(options)), true, options?.context);
};

type GetEmbeddingByTraceListFilterRequest = Omit<EmbeddingsFilterRequest, 'interval'> & {
  dateRange: { fromTimestamp: number; toTimestamp: number | null | undefined };
};
export const getEmbeddingsDataByTraceListFilter = (
  params: GetEmbeddingByTraceListFilterRequest,
  options?: CallOptions,
): Promise<TraceEmbeddingsResponse | null> => {
  const { dateRange, ...rest } = params;
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const request: EmbeddingsFilterRequest = {
    interval: getInterval(dateRange.fromTimestamp, dateRange.toTimestamp),
    ...rest,
  };
  return tryGetMetadata(
    () => client.traces.embeddingsByTraceListFilter(request, axiosCallConfig(options)),
    true,
    options?.context,
  );
};
