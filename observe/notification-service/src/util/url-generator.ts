import { ColumnSchema, SegmentTag, TimePeriod } from '@whylabs/songbird-node-client';
import { isNotUndefined } from './type-guards';
import {
  DateConstructor,
  dateConstructorToDatePickerFormat,
  getFullDateFromISO,
  NullableDateConstructor,
} from './dateUtils';

/**
 * This converts segment tags into a safely encoded URI param
 * This logic must match the way the front end parses these, otherwise links won't work
 * @param segmentTags
 */
const getEncodedSegmentUri = (segmentTags: SegmentTag[]): string =>
  segmentTags
    .filter((tag) => isNotUndefined(tag.key) && isNotUndefined(tag.value))
    .map((tag) => `key=${encodeURIComponent(tag.key ?? '')}&value=${encodeURIComponent(tag.value ?? '')}`)
    .join('&');

const getConstraintsUrl = (datasetId: string): string => `/resources/${datasetId}/constraints`;

const getDatasetUrl = (datasetId: string): string => `/resources/${datasetId}`;

const getDatasetFeatureUrl = (
  datasetId: string,
  featureName: string,
  columnSchema?: ColumnSchema | undefined,
): string => {
  if (columnSchema?.classifier === 'output') {
    return `/resources/${datasetId}/output/${featureName}`;
  }
  return `/resources/${datasetId}/columns/${featureName}`;
};

const getSegmentUrl = (datasetId: string, segmentTags: SegmentTag[]): string =>
  `/resources/${datasetId}/segments/${getEncodedSegmentUri(segmentTags)}`;

const getSegmentFeatureUrl = (datasetId: string, featureName: string, segmentTags: SegmentTag[]): string =>
  `/resources/${datasetId}/segments/${getEncodedSegmentUri(segmentTags)}/features/${featureName}`;

// example output startDate=2022-03-01&endDate=2022-06-14 or startDate=2022-03-01T23h00m&endDate=2022-03-01T23h59m
const getDateRangeUrl = (
  startDate: DateConstructor,
  endDate?: NullableDateConstructor,
  timePeriod: TimePeriod = TimePeriod.P1D,
): string => {
  const now = new Date();
  const includeHours = timePeriod === TimePeriod.Pt1H;
  const startParam = dateConstructorToDatePickerFormat(startDate, { includeHours });
  if (!startParam) return '';
  const endParam =
    dateConstructorToDatePickerFormat(endDate || now, { includeHours }) ?? getFullDateFromISO(now.toISOString());
  return `startDate=${startParam}&endDate=${endParam}`;
};

export interface DashboardLinks {
  datasetUrl: string;
  featureUrl?: string;
}

const trimUrl = (dashboardBaseUrl: string): string =>
  dashboardBaseUrl.endsWith('/') ? dashboardBaseUrl.slice(0, -1) : dashboardBaseUrl;

export const getModelConstraintsUrl = (
  baseUrl: string,
  datasetId: string,
  targetOrgId?: string,
  startDate?: NullableDateConstructor,
  endDate?: NullableDateConstructor,
  resourceTimePeriod?: TimePeriod,
): string => {
  const params: string[] = [];
  if (startDate) {
    params.push(getDateRangeUrl(startDate, endDate, resourceTimePeriod));
  }
  if (targetOrgId) {
    params.push(`targetOrgId=${targetOrgId}`);
  }
  const paramsUrl = params.length < 1 ? '' : '?' + params.join('&');
  return `${trimUrl(baseUrl)}${getConstraintsUrl(datasetId)}${paramsUrl}`;
};

export const getModelOverviewUrl = (
  baseUrl: string,
  datasetId: string,
  tags: SegmentTag[],
  targetOrgId?: string,
  startDate?: NullableDateConstructor,
  endDate?: NullableDateConstructor,
  resourceTimePeriod?: TimePeriod,
): string => {
  const params: string[] = [];

  if (startDate) {
    params.push(getDateRangeUrl(startDate, endDate, resourceTimePeriod));
  }

  if (targetOrgId) {
    params.push(`targetOrgId=${targetOrgId}`);
  }
  const paramsUrl = params.length < 1 ? '' : '?' + params.join('&');

  if (tags.length) {
    return `${trimUrl(baseUrl)}${getSegmentUrl(datasetId, tags)}${paramsUrl}`;
  }
  return `${trimUrl(baseUrl)}${getDatasetUrl(datasetId)}${paramsUrl}`;
};

export const getModelAlertsUrl = (
  baseUrl: string,
  datasetId: string,
  tags: SegmentTag[],
  targetOrgId?: string,
  startDate?: NullableDateConstructor,
  endDate?: NullableDateConstructor,
  resourceTimePeriod?: TimePeriod,
): string => {
  const params: string[] = [];

  if (startDate) {
    params.push(getDateRangeUrl(startDate, endDate, resourceTimePeriod));
  }

  if (targetOrgId) {
    params.push(`targetOrgId=${targetOrgId}`);
  }
  const paramsUrl = params.length < 1 ? '' : '?' + params.join('&');

  // Goes to: resources/model-0/monitor-manager/anomalies-feed
  return `${trimUrl(baseUrl)}${getDatasetUrl(datasetId)}/monitor-manager/anomalies-feed${paramsUrl}`;
};

export const getMonitorManagerUrl = (baseUrl: string, datasetId: string, targetOrgId?: string): string => {
  const params: string[] = [];

  if (targetOrgId) {
    params.push(`targetOrgId=${targetOrgId}`);
  }
  const paramsUrl = params.length < 1 ? '' : '?' + params.join('&');

  return `${trimUrl(baseUrl)}${getDatasetUrl(datasetId)}/monitor-manager${paramsUrl}`;
};

export const getNotificationSettingUrl = (baseUrl: string, targetOrgId?: string): string => {
  const params: string[] = [];

  if (targetOrgId) {
    params.push(`targetOrgId=${targetOrgId}`);
  }
  const paramsUrl = params.length < 1 ? '' : '?' + params.join('&');

  return `${trimUrl(baseUrl)}/settings/notifications${paramsUrl}`;
};

export const getDashboardLinks = (
  dashboardBaseUrl: string,
  datasetId: string,
  feature: string,
  segmentTags?: SegmentTag[],
  targetOrgId?: string,
  startDate?: NullableDateConstructor,
  endDate?: NullableDateConstructor,
  resourceTimePeriod?: TimePeriod,
  columnSchema?: ColumnSchema | undefined,
): DashboardLinks => {
  // strip the trailing slash if needed
  const correctedDashboardLink = trimUrl(dashboardBaseUrl);
  const params: string[] = [];

  if (!feature) {
    throw new Error('Missing feature for generating URL');
  }

  if (startDate) {
    params.push(getDateRangeUrl(startDate, endDate, resourceTimePeriod));
  }

  if (targetOrgId) {
    params.push(`targetOrgId=${targetOrgId}`);
  }

  const paramsUrl = params.length < 1 ? '' : '?' + params.join('&');

  if (segmentTags?.length) {
    return {
      datasetUrl: correctedDashboardLink + getSegmentUrl(datasetId, segmentTags) + paramsUrl,
      featureUrl: correctedDashboardLink + getSegmentFeatureUrl(datasetId, feature, segmentTags) + paramsUrl,
    };
  }

  return {
    datasetUrl: correctedDashboardLink + getDatasetUrl(datasetId) + paramsUrl,
    featureUrl: correctedDashboardLink + getDatasetFeatureUrl(datasetId, feature, columnSchema) + paramsUrl,
  };
};

// currently multi-feature links are not supported, blank out the links
export const getMultiFeaturedDashboardLinks = (
  dashboardBaseUrl: string,
  datasetId: string,
  features: string[],
  segmentTags?: SegmentTag[],
  targetOrgId?: string,
  startDate?: NullableDateConstructor,
  endDate?: NullableDateConstructor,
  resourceTimePeriod?: TimePeriod,
): DashboardLinks => {
  // strip the trailing slash if needed
  const correctedDashboardLink = trimUrl(dashboardBaseUrl);
  const params: string[] = [];

  if (!features || features.length == 0) {
    throw new Error('Missing feature for generating URL');
  }

  if (startDate) {
    params.push(getDateRangeUrl(startDate, endDate, resourceTimePeriod));
  }

  if (targetOrgId) {
    params.push(`targetOrgId=${targetOrgId}`);
  }

  const paramsUrl = params.length < 1 ? '' : '?' + params.join('&');

  // TODO: support links targeting more than one feature
  if (segmentTags && segmentTags?.length > 0) {
    return {
      datasetUrl: correctedDashboardLink + getSegmentUrl(datasetId, segmentTags) + paramsUrl,
      featureUrl: undefined,
    };
  } else {
    return {
      datasetUrl: correctedDashboardLink + getDatasetUrl(datasetId) + paramsUrl,
      featureUrl: undefined,
    };
  }
};
