import { ApolloQueryResult, NetworkStatus } from '@apollo/client';
import { MockedResponse } from '@apollo/client/testing';
import {
  GetModelOverviewInformationDocument,
  GetModelOverviewInformationQuery,
  ModelType,
  TimePeriod,
} from 'generated/graphql';
import { ResourceOverviewData } from '../../../layoutHelpers';

export const data: { models: ResourceOverviewData[] } = {
  models: [
    {
      name: 'lending_club_credit_model',
      id: 'model-0',
      modelType: ModelType.Classification,
      batchFrequency: TimePeriod.P1D,
      totalAnomaliesInRange: 0,
      entitySchema: {
        inputCounts: {
          total: 103,
        },
        outputCounts: {
          total: 1,
        },
      },
      totalSegments: 37,
      resourceTags: [],
    },
    {
      name: 'st-111',
      id: 'model-138',
      modelType: ModelType.Unknown,
      batchFrequency: TimePeriod.P1D,
      totalAnomaliesInRange: 4,
      entitySchema: { inputCounts: { total: 0 }, outputCounts: { total: 0 } },
      totalSegments: 0,
      latestAnomalyTimestamp: null,
      resourceTags: [],
      // alerts: [],
    },
  ],
};

export const queryMock: ReadonlyArray<MockedResponse> = [
  {
    request: {
      query: GetModelOverviewInformationDocument,
      variables: {
        from: 0,
        to: 1626687266918,
      },
    },
    result: {
      data,
    },
  },
];

export const refetchData = async (): Promise<ApolloQueryResult<GetModelOverviewInformationQuery>> =>
  new Promise((resolve) => {
    const resolveData: ApolloQueryResult<GetModelOverviewInformationQuery> = {
      data,
      loading: false,
      networkStatus: NetworkStatus.ready,
    };

    resolve(resolveData);
  });
