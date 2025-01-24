import { z } from 'zod';

import {
  ColumnDataType,
  ColumnSchema,
  getDataTypeFromString,
} from '../../services/data/datasources/helpers/entity-schema';
import { filterColumnsByMonitorTarget } from '../../services/data/monitor/monitor-targets';
import { getSchemaForResource } from '../../services/data/songbird/api-wrappers/entity-schema';
import { router, viewResourceDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';

type ColumnReturnType = {
  isDiscrete: boolean;
  dataType?: ColumnDataType;
  name: string;
};

const columnFromSchema = (schema: ColumnSchema): ColumnReturnType => {
  const isDiscrete = schema.discreteness === 'discrete';

  return {
    isDiscrete,
    name: schema.column,
    dataType: getDataTypeFromString.get(schema.dataType ?? ''),
  };
};

const filterSchema = z
  .union([
    z.object({ monitorId: z.string() }),
    z.object({
      discreteOnly: z.boolean().nullish(),
      dataType: z.array(z.enum(['integral', 'fractional', 'bool', 'string', 'unknown'])).nullish(),
    }),
  ])
  .optional();

export const columns = router({
  list: viewResourceDataProcedure
    .input(z.object({ filter: filterSchema }))
    .query(async ({ input: { filter, orgId, resourceId }, ctx }): Promise<ColumnReturnType[]> => {
      const callOptions = callOptionsFromTrpcContext(ctx);

      const data = await getSchemaForResource(orgId, resourceId, callOptions);
      if (!data) return [];

      const { columns: columnsSchema } = data?.entitySchema ?? {};
      const result = new Set<ColumnReturnType>([]);
      // If monitorId is provided, fetch columns for that monitor
      if (filter && 'monitorId' in filter) {
        const monitorFilteredColumns = await filterColumnsByMonitorTarget(
          orgId,
          resourceId,
          filter.monitorId,
          columnsSchema,
          callOptions,
        );

        monitorFilteredColumns.forEach((c) => {
          const schema = columnsSchema.find((s) => s.column === c);
          if (schema) {
            result.add(columnFromSchema(schema));
          }
        });
      } else {
        columnsSchema.forEach((schema) => {
          const column = columnFromSchema(schema);
          if (filter?.discreteOnly && !column.isDiscrete) return;
          if (
            filter?.dataType?.length &&
            !filter.dataType.find((dt) => getDataTypeFromString.get(dt) === column.dataType)
          )
            return;

          result.add(column);
        });
      }

      return Array.from(result);
    }),
});
