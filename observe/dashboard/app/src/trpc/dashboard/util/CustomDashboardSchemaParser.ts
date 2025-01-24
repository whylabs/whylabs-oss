import path from 'path';

import { cloneDeep } from 'lodash';

import { TimePeriod } from '../../../graphql/generated/graphql';
import { CUSTOM_METRIC_VALUE_SEPARATOR } from '../../../graphql/resolvers/types/metrics';
import { getLogger } from '../../../providers/logger';
import { DataServiceCustomDashboard } from '../../../services/data/data-service/api-wrappers/custom-dashboards';
import { JSONObject } from '../../../types/generic-types';
import { translateJsonObject } from '../../../util/json-utils';
import { mapStringToTimePeriod } from '../../../util/time-period-utils';
import { isNumber, isString } from '../../../util/type-guards';
import { CustomDashboardSchema, CustomDashboardWidgets, DashboardDateRangeType } from '../types/dashboards';
import { TimeseriesQueryUnion } from '../types/queries';

const logger = getLogger(path.parse(__filename).name);

const baseSchemaStructure: CustomDashboardSchema = {
  id: '',
  charts: [],
  dateRange: undefined,
  version: 1,
};

const parseStringAttribute = (
  key: keyof CustomDashboardSchema,
  unknownObject: JSONObject,
  parsed: CustomDashboardSchema,
) => {
  const isStringTypeField = key === 'id';
  if (isStringTypeField && typeof unknownObject?.[key] === 'string') {
    parsed[key] = unknownObject[key] as string; // cast is safe because we checked type before
  }
};

const parseNumberAttribute = (
  key: keyof CustomDashboardSchema,
  unknownObject: JSONObject,
  parsed: CustomDashboardSchema,
) => {
  const isNumberTypeField = key === 'version';
  if (isNumberTypeField && typeof unknownObject?.[key] === 'number') {
    parsed[key] = unknownObject[key] as number; // cast is safe because we checked type before
  }
};

const parseDateRangeAttribute = (unknownObject: JSONObject, parsed: CustomDashboardSchema) => {
  const dateRange = translateJsonObject(unknownObject.dateRange);
  if (!dateRange) return;
  if ('type' in dateRange && dateRange.type === DashboardDateRangeType.fixed) {
    const { startDate, endDate } = dateRange;
    if (startDate && endDate && isString(startDate) && isString(endDate)) {
      parsed.dateRange = {
        type: DashboardDateRangeType.fixed,
        startDate,
        endDate,
      };
    }
    return;
  }
  if ('type' in dateRange && dateRange.type === DashboardDateRangeType.relative) {
    const { timePeriod, size } = dateRange;
    if (isString(timePeriod) && isNumber(size)) {
      const usedTimePeriod = mapStringToTimePeriod.get(timePeriod) ?? TimePeriod.P1D;
      parsed.dateRange = {
        type: DashboardDateRangeType.relative,
        timePeriod: usedTimePeriod,
        size,
      };
    }
  }
};

const parseChartsAttribute = (unknownObject: JSONObject, parsed: CustomDashboardSchema) => {
  if ('charts' in unknownObject) {
    // TODO: add validation for charts schema
    parsed.charts = (unknownObject.charts as unknown as CustomDashboardWidgets[]).map((widget) => {
      if (widget.type !== 'timeseries') return widget;
      const mappedSeries = widget.timeseries.map((plot) => {
        const { source, metric, disableColumn, columnName } = plot;
        if (source !== 'Profiles') return plot;
        const [metricName] = metric.split(CUSTOM_METRIC_VALUE_SEPARATOR);
        // if disableColumn is true, this is a dataset/custom metric, so we compose it using the columnName from queryDefinition
        const adjustedMetricValue =
          disableColumn && columnName ? `${metricName}${CUSTOM_METRIC_VALUE_SEPARATOR}${columnName}` : metricName;
        return { ...plot, metric: adjustedMetricValue };
      }) as TimeseriesQueryUnion[];
      return { ...widget, timeseries: mappedSeries };
    });
  }
};

export const parseFromDataServiceDashboard = ({
  id,
  schema,
}: DataServiceCustomDashboard): CustomDashboardSchema | null => {
  const parsedSchema = customDashboardSchemaParser(schema);
  if (!parsedSchema) return null;
  // TODO: Improve parsing until we can remove the JSON.parse spreading
  return {
    ...JSON.parse(schema),
    ...parsedSchema,
    id,
  };
};

const customDashboardSchemaParser = (schema: string): CustomDashboardSchema | null => {
  try {
    const translatedJson = translateJsonObject(JSON.parse(schema));
    if (!translatedJson) return null;
    const version = Number(translatedJson.version);
    if (!version || version === 2) return customDashboardSchemaParserV2(translatedJson);

    if (version === 1) return customDashboardSchemaParserV1(translatedJson);
  } catch (e) {
    logger.error(e, 'Failed to parse dashboard schema %s', schema);
  }
  return null;
};

const customDashboardSchemaParserV1 = (schemaObject: JSONObject): CustomDashboardSchema | null => {
  const parsed: CustomDashboardSchema = cloneDeep(baseSchemaStructure);
  parseStringAttribute('id', schemaObject, parsed);
  parseNumberAttribute('version', schemaObject, parsed);
  parseDateRangeAttribute(schemaObject, parsed);
  parseChartsAttribute(schemaObject, parsed);

  // Fix for V2: renamed 'segments' to 'segment'
  const fixV1ChartSegment = (obj: Record<string, unknown>) => {
    if ('segments' in obj && obj.segments) {
      obj.segment = obj.segments;
      delete obj.segments;
    }
  };
  parsed.charts.forEach((chart) => {
    if ('pie' in chart) {
      chart.pie.forEach(fixV1ChartSegment);
    } else if ('timeseries' in chart) {
      chart.timeseries.forEach(fixV1ChartSegment);
    }
  });

  if (customDashboardSchemaValidate(parsed)) {
    return parsed;
  }
  return null;
};

const customDashboardSchemaParserV2 = (schemaObject: JSONObject): CustomDashboardSchema | null => {
  const parsed: CustomDashboardSchema = cloneDeep(baseSchemaStructure);
  parseStringAttribute('id', schemaObject, parsed);
  parseNumberAttribute('version', schemaObject, parsed);
  parseDateRangeAttribute(schemaObject, parsed);
  parseChartsAttribute(schemaObject, parsed);

  if (customDashboardSchemaValidate(parsed)) {
    return parsed;
  }
  return null;
};

export const customDashboardSchemaValidate = (schema: CustomDashboardSchema): boolean => {
  if (!schema.id) return false;
  // TODO: implement schema validation here
  return true;
};
