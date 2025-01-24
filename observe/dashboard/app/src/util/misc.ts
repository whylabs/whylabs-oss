import { readdirSync } from 'fs';
import path from 'path';

import { SegmentTag as SongbirdSegmentTag } from '@whylabs/songbird-node-client';
import { Logger } from 'pino';

import { SegmentTag as GQLSegmentTag, SortDirection } from '../graphql/generated/graphql';
import { Maybe } from '../services/data/data-service/data-service-types';

// DO NOT TRY TO IMPORT getLogger here, it will cause import issues

// None - token representing "no value." Unlike `null`, it has to be set and checked explicitly,
// reducing the risk of unexpected behavior at runtime and reliance on null checks.
export const NONE = Symbol('none');

export type None = typeof NONE;
export const notNone = <T>(o: Option<T>): o is T => o !== NONE;
export const valueOrNull = <T>(o: Option<T>): T | null => (notNone(o) ? o : null);
export const valueOrNone = <T>(o: Maybe<T>): Option<T> => (notNullish(o) ? o : NONE);

// Wrapper type signifying that the underlying value may or may not be present
export type Option<T> = T | None;

// helper type for extracting the type of items within a Set
export type SetType<T> = T extends Set<infer U> ? U : never;

// helper type for extracting the type of items within an Array
export type ArrayType<T> = T extends readonly (infer U)[] ? U : never;

export type OperationContext = {
  name?: string; // expect either name or data type
  dataType?:
    | 'baseline'
    | 'feature'
    | 'metadata'
    | 'event'
    | 'alert'
    | 'monitorConfig'
    | 'entitySchema'
    | 'anomaly'
    | 'analyzerRun'
    | 'anomalyCount'
    | 'profile'
    | 'metric';
  orgId?: string;
  datasetId?: string;
  segmentTags?: GQLSegmentTag[];
  datasetTimestamp?: number;
  featureName?: string;
};

export const describeOperationContext = (context?: OperationContext): string => {
  if (!context) return '';
  let text = ` in orgId: ${context.orgId ?? 'unknown'}`;
  if (context.name) text += ` op: ${context.name}`;
  if (context.dataType) text += ` data: ${context.dataType}`;
  if (context.datasetId) text += ` dataset: ${context.datasetId}`;
  if (context.segmentTags) text += ` segment: ${describeTags(context.segmentTags)}`;
  if (context.datasetTimestamp) text += ` ts: ${context.datasetTimestamp}`;
  if (context.featureName) text += ` col: ${context.featureName}`;
  return text;
};

export const pathToBucketKey = (path?: string): { bucket: string; key: string } => {
  if (!path) throw new Error('Path is null or undefined, cannot generate bucket/key pair');
  const regexGroups = /^s3:\/\/((\w|-)+)\/(.+)$/.exec(path);
  const bucket = regexGroups?.length ? regexGroups[1] : null;
  const key = regexGroups?.length ? regexGroups[3] : null;
  if (!bucket || !key) throw new Error(`Failed to extract bucket/key combination from path ${path}`);
  return {
    bucket,
    key,
  };
};

export const describeTags = (tags?: (GQLSegmentTag | SongbirdSegmentTag)[]): string => {
  if (!tags) return 'undefined';
  if (!tags.length) return 'all';
  return tags.map((tag) => `${tag.key}=${tag.value}`).join('&');
};

export const pageArray = <T>(array: T[], offset: number, limit: number): T[] => {
  const tailIndex = limit ? offset + limit : array.length;
  return array.slice(offset, tailIndex);
};

export const extractEmailDomain = (email?: string | null): string => email?.split('@')?.pop() ?? '';

export const isEmail = (maybeEmail: string): boolean => !!maybeEmail.match(/.+@.+\..+/i);

export const sanitizeSearchString = (searchString: string): string =>
  isEmail(searchString) ? `***@${extractEmailDomain(searchString)}` : searchString;

/**
 * Throws with the specified message.
 * Usage example: const foo = bar ?? throwIfNull('bar is nullish!')
 * @param message
 */
export const fnThrow = (message: string): never => {
  throw new Error(message);
};

/**
 * Throws Not Implemented error
 */
export const notImplemented = (msg?: string): never => {
  throw Error(msg ? `Not Implemented: ${msg}` : `Not Implemented`);
};

/**
 * Asserts the object of type T is, in fact, T and not null or undefined
 * @param obj The object
 */
export const notNullish = <T>(obj: Maybe<T | null>): obj is T => obj !== null && obj !== undefined;

/**
 * Converts an env var to a number or null (if the number is invalid or not set)
 * @param envVarName
 */
export const getNumericEnvVar = (envVarName: string): number | null => {
  const envVar = process.env[envVarName];
  const value = parseFloat(envVar ?? '');
  if (isNaN(value)) {
    return null;
  }

  return value;
};

export type SortableValue = string | number; // Should be extended further to match other types also

const sortAscNumeric = (a: number, b: number): number => {
  if (a < b) return -1;
  if (a > b) return 1;

  return 0;
};

const sortDescNumeric = (a: number, b: number): number => {
  if (a < b) return 1;
  if (a > b) return -1;

  return 0;
};

const sortAscStr = (a: string, b: string): number => {
  return a.localeCompare(b);
};

const sortDescStr = (a: string, b: string): number => {
  return -1 * a.localeCompare(b);
};

export const sortAsc = <T extends SortableValue>(a: T, b: T): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return sortAscNumeric(a, b);
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return sortAscStr(a, b);
  }

  throw Error(`Cannot sort values - unsupported or non homogenous items in the list`);
};

export const sortDesc = <T extends SortableValue>(a: T, b: T): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return sortDescNumeric(a, b);
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return sortDescStr(a, b);
  }

  throw Error(`Cannot sort values - unsupported or non homogenous items in the list`);
};

type SortableItemWithName = {
  name: string;
};

export const sortItemsByName = (items: SortableItemWithName[], direction: SortDirection): void => {
  switch (direction) {
    case SortDirection.Asc:
      items.sort((itemA, itemB) => sortAsc(itemA.name, itemB.name));
      break;
    case SortDirection.Desc:
      items.sort((itemA, itemB) => sortDesc(itemA.name, itemB.name));
      break;
    default:
      throw new Error(`Unknown sort direction ${direction}`);
  }
};

type FilePath = string;

/**
 * Discovers files with the specific extension within the target directory (recursively)
 * @param logger Logger instance to use
 * @param dir Directory to look inside of
 * @param extension File extension to look for
 */
export const findFilesRecursive = (logger: Logger, dir: string, extension: string): FilePath[] => {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entity) => {
    if (entity.name.endsWith(extension)) {
      return path.join(dir, entity.name);
    }
    if (!entity.isDirectory()) {
      logger.warn(
        "Found unknown entity in the GraphQL schema folder: %s. It probably shouldn't be there.",
        entity.name,
      );
      return [];
    }

    return findFilesRecursive(logger, path.join(dir, entity.name), extension);
  });
};

/**
 * Returns the array providing it exists and is not empty
 * @param arr
 */
export const ifNotEmpty = <T>(arr: T[] | null | undefined): T[] | undefined => {
  return arr && arr.length ? arr : undefined;
};
