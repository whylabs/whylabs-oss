// Comes from the monitor config schema, although it's just an integer there:
// https://gitlab.com/whylabs/core/monitor-schema/-/blob/main/schema/schema.yaml#L1056
// TODO: import from monitor config schema

import { ColumnSchema, OrganizationMetadata, TimePeriod } from '@whylabs/songbird-node-client';
import { getDashboardLinks, getMultiFeaturedDashboardLinks } from '../../util/url-generator';
import { segmentTextToTags } from '../../util/misc';
import { getLogger } from '../../providers/logger';
import { getObject, parseUrl } from '../../services/data/s3-connector';
import { NullableDateConstructor } from '../../util/dateUtils';

const logger = getLogger('MonitorCommon');

export enum MonitorSeverity {
  Low = 3,
  Medium = 2,
  High = 1,
}

export enum MonitorModeType {
  Digest = 'DIGEST',
  EveryAnomaly = 'EVERY_ANOMALY',
}

/**
 * Convert severity number to string, including ones not in the 1-3 range
 */
export const severityToString = (sev: number): string => {
  return (MonitorSeverity[sev] ?? `severity ${sev}`).toLocaleLowerCase();
};

/**
 * a high severity issue
 * 10 high severity issues
 * @param sev
 * @param numAnomalies
 */
export const severityToFriendlyDescriptor = (sev: number, numAnomalies = 1): string => {
  const friendlySev: string | undefined = MonitorSeverity[sev]; // it's possible we get a sev value outside the 1-3 range
  const prefix = numAnomalies == 1 ? 'a ' : numAnomalies + ' ';
  const issue = `issue${numAnomalies && numAnomalies > 1 ? 's' : ''}`;
  if (friendlySev) {
    return `${prefix}${friendlySev.toLocaleLowerCase()} severity ${issue}`;
  }
  return `${prefix}severity ${sev} ${issue}`;
};

export const generateLink = (
  org: OrganizationMetadata,
  targetLevel: string | undefined,
  datasetId: string,
  columns?: string[],
  segment?: string | null,
  startDate?: NullableDateConstructor,
  endDate?: NullableDateConstructor,
  resourceTimePeriod?: TimePeriod,
  columnSchema?: ColumnSchema | undefined,
): string | null => {
  if (!org.observatoryUrl || !(org.observatoryUrl.trim().length > 0) || !columns || columns.length == 0) {
    return null;
  }

  const segmentTags = segmentTextToTags(logger, segment);
  const { datasetUrl, featureUrl } =
    columns.length == 1
      ? getDashboardLinks(
          org.observatoryUrl,
          datasetId,
          columns[0],
          segmentTags,
          org.id,
          startDate,
          endDate,
          resourceTimePeriod,
          columnSchema,
        )
      : getMultiFeaturedDashboardLinks(
          org.observatoryUrl,
          datasetId,
          columns,
          segmentTags,
          org.id,
          startDate,
          endDate,
          resourceTimePeriod,
        );

  switch (targetLevel) {
    case 'column':
      return featureUrl ?? datasetUrl;
    default:
      return datasetUrl;
  }
};

export const getImageBase64 = async (imageS3Url: string): Promise<string | null> => {
  let base64image = null;
  if (imageS3Url != null && imageS3Url.startsWith('s3')) {
    const { bucket, key } = parseUrl(imageS3Url);
    const imgBuffer = await getObject(bucket, key);
    if (imgBuffer != null) {
      base64image = imgBuffer.toString('base64');
    }
  }
  return base64image;
};
