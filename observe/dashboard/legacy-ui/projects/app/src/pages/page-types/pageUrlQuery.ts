import queryString from 'query-string';
import { hackEncodeURIComponent } from 'utils/hackEncodeURIComponent';
import { PageType } from './pageType';
import { ActionRoutePath } from '../settings-pages/notifications/globalActionUtils';

export interface UniversalPageParams {
  dashboardId: string;
  pageType: PageType;
  modelId: string;
  segment: ParsedSegment;
  featureId: string;
  profileId: string;
  outputName: string;
  demoName: string;
  monitorId: string;
  passedId: string;
  actionType: ActionRoutePath | undefined;
  profiles: (string | number)[];
  alternativeSegment: ParsedSegment;
  profileReport: string;
}

export type UniversalQuery = {
  dashboardId: string;
  modelId: string;
  segment: string;
  featureId: string;
  outputName: string;
  profileId: string;
  demoName: string;
  monitorId: string;
  passedId: string;
  actionType: ActionRoutePath | undefined;
};

export interface UniversalQueryParams {
  profiles: string[];
  segmentKeys: string[];
  segmentValues: string[];
  profileReport: string | null;
}

export const SEGMENT_SEARCH_PREFIX = 'segment';

export type ArrayType<T> = T extends (infer U)[] ? U : never;

export function parseProfileId(profileId: string): string | number {
  const num = Number(profileId);
  if (!Number.isNaN(num)) {
    return num;
  }

  return profileId;
}

export function displaySegment(segment: ParsedSegment): string {
  return segment.tags.reduce((fullName, tag) => {
    const next = `${tag.key}=${tag.value}`;
    return fullName === '' ? next : `${fullName}&${next}`;
  }, '');
}

export function getSegmentTags(segment: ParsedSegment): string[] {
  return segment.tags.map((tag) => `${tag.key}=${tag.value}`);
}

export function searchStringifySegment(segment: ParsedSegment): string {
  return simpleStringifySegment(segment, SEGMENT_SEARCH_PREFIX);
}
export function simpleStringifySegment(segment: ParsedSegment | null, prefix?: string): string {
  if (!segment) return '';
  return segment.tags.reduce((acc, curr) => {
    const nextKey = hackEncodeURIComponent(curr.key);
    const nextValue = hackEncodeURIComponent(curr.value);
    const next = `${prefix ?? ''}key=${nextKey}&${prefix ?? ''}value=${nextValue}`;
    return acc === '' ? next : `${acc}&${next}`;
  }, '');
}

function ensureStringArray(arg: string | string[] | null | undefined): string[] {
  if (Array.isArray(arg)) {
    return arg;
  }
  if (arg === null || arg === undefined) {
    return [];
  }
  return [arg];
}

export function decodeAndCreateSegment(keys: string[], values: string[]): ParsedSegment {
  const parsedSegment: ParsedSegment = { tags: [] };
  keys.forEach((key, index) => {
    if (index < values.length) {
      parsedSegment.tags.push({ key: decodeURIComponent(key), value: decodeURIComponent(values[index]) });
    }
  });
  return parsedSegment;
}

export function parseSimpleDisplaySegment(urlString: string, prefix?: string): ParsedSegment {
  const parsedString = queryString.parse(urlString);
  const keys = ensureStringArray(parsedString[`${prefix ?? ''}key`]);
  const values = ensureStringArray(parsedString[`${prefix ?? ''}value`]);
  return decodeAndCreateSegment(keys, values);
}

export interface ParsedSegment {
  tags: { key: string; value: string }[];
}

export function parsedSegmentEquals(p1: ParsedSegment, p2: ParsedSegment): boolean {
  // TODO implement better
  return displaySegment(p1) === displaySegment(p2);
}

function hackDecodeURIComponent(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export function parseParams(
  rawParams: Partial<UniversalQuery>,
  pageType: PageType,
  queryParams?: UniversalQueryParams,
): UniversalPageParams {
  const { dashboardId, modelId, featureId, segment, outputName, profileId, demoName, monitorId, passedId, actionType } =
    rawParams;
  const parseFunction = parseSimpleDisplaySegment;
  const parsedSegment: ParsedSegment | undefined = segment ? parseFunction(segment) : { tags: [] };
  const parsedFeature = featureId ? hackDecodeURIComponent(featureId) : '';
  const parsedOutputName = outputName ? hackDecodeURIComponent(outputName) : '';
  const profiles = queryParams ? queryParams.profiles : [];
  const parsedAlternativeSegment: ParsedSegment = queryParams
    ? decodeAndCreateSegment(queryParams.segmentKeys, queryParams.segmentValues)
    : { tags: [] };
  const profileReport = queryParams ? queryParams.profileReport : '';

  return {
    pageType,
    dashboardId: dashboardId ?? '',
    modelId: modelId ?? '',
    actionType,
    featureId: parsedFeature,
    outputName: parsedOutputName,
    segment: parsedSegment,
    profileId: profileId ?? '',
    demoName: demoName ?? '',
    monitorId: monitorId ?? '',
    passedId: passedId ?? '',
    profiles: profiles.map(parseProfileId),
    alternativeSegment: parsedAlternativeSegment,
    profileReport: profileReport ?? '',
  };
}
