import path from 'path';

import { z } from 'zod';

import { TimePeriod } from '../../graphql/generated/graphql';
import { getLogger } from '../../providers/logger';
import { listConstraints } from '../../services/data/songbird/api-wrappers/monitor-config';
import { processPromiseInChunks } from '../../util/async-helpers';
import { getAnalyzerAnomaliesCount } from '../analysis/analyzer';
import { TrpcContext, router, viewDataProcedure } from '../trpc';
import { formatTrpcContext } from '../trpc-error';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { commonDateRangeInputSchema, segmentTagsSchema } from '../util/schemas';

const logger = getLogger(path.parse(__filename).base);

const constraintSchema = z
  .object({
    constraintDefinition: z.string(),
    config: z.object({
      metric: z.string().nullish(),
      type: z.string().nullish(),
      analyzerIds: z.array(z.string()).nullish(),
    }),
    displayName: z.string().nullish(),
    targetMatrix: z
      .object({
        include: z.array(z.string()).nullish(),
      })
      .nullish(),
    id: z.string().min(1),
  })
  .transform((c) => {
    return {
      ...c,
      displayName: c.displayName || c.id,
      metricName: c.config.metric,
    };
  });

type ParsedAnalyzer = z.infer<typeof constraintSchema>;
export type ValidConstraint = ParsedAnalyzer & {
  anomaliesCount: number;
};

type ParsedConstraint = z.infer<typeof constraintSchema> | null;

const getParsedConstraint = (constraint: Record<string, unknown> | null, ctx: TrpcContext): ParsedConstraint => {
  try {
    return constraintSchema.parse(constraint);
  } catch (error) {
    logger.error({ constraint, error }, `Couldn't parse constraint string ${formatTrpcContext(ctx)}`);
    return null;
  }
};

export const mapCompositeAnalyzerTargetMatrix = (
  parsedAnalyzer: ParsedAnalyzer,
  analyzersList: (ParsedAnalyzer | null)[],
): ParsedAnalyzer => {
  const { config } = parsedAnalyzer ?? {};
  if (config?.type === 'disjunction' || config?.type === 'conjunction') {
    const childrenAnalyzers = analyzersList.filter((a) => a && config?.analyzerIds?.includes(a.id));
    const joinedIncludedColumns: string[] = [];
    childrenAnalyzers.forEach((c) => {
      const includeArray = c?.targetMatrix?.include ?? [];
      joinedIncludedColumns.push(...includeArray);
    });
    return {
      ...parsedAnalyzer,
      targetMatrix: {
        include: joinedIncludedColumns,
      },
    };
  }
  return parsedAnalyzer;
};

const CHUNK_STEP = 50;

const constraintsListInputSchema = z
  .object({
    segment: segmentTagsSchema,
  })
  .merge(commonDateRangeInputSchema);
export const constraints = router({
  list: viewDataProcedure.input(constraintsListInputSchema).query(async ({ ctx, input }) => {
    const { orgId, resourceId } = input;
    const callOptions = callOptionsFromTrpcContext(ctx);

    const jsonConstraints = await listConstraints(orgId, resourceId, callOptions);
    const parsedConstraints = jsonConstraints?.map((c) => getParsedConstraint(c, ctx));
    const list: ValidConstraint[] = [];

    const constraintCount = parsedConstraints.length;

    const constraintHandlerCallback = async (parsed: ParsedConstraint) => {
      if (!parsed) return;
      const constraint = mapCompositeAnalyzerTargetMatrix(parsed, parsedConstraints);

      const anomaliesCountResponse = await getAnalyzerAnomaliesCount(
        {
          ...input,
          analyzerIds: [constraint.id],
          timePeriod: TimePeriod.All,
        },
        callOptions,
      );

      if (anomaliesCountResponse?.length) {
        const aggCount = anomaliesCountResponse.reduce((acc, r) => acc + r.anomalyCount, 0) ?? 0;
        list.push({
          ...constraint,
          anomaliesCount: aggCount,
        });
      }
    };

    try {
      await processPromiseInChunks<ParsedConstraint>(parsedConstraints, constraintHandlerCallback, CHUNK_STEP, true);
    } catch (e) {
      logger.error(`failed to fetch constraints: ${e}`);
    }

    // sorting to display failed constraints first
    const segmentConstraints = list.sort((a, b) => {
      if (a.anomaliesCount && !b.anomaliesCount) return -1;
      if (b.anomaliesCount && !a.anomaliesCount) return 1;
      return 0;
    });

    return {
      segmentConstraints,
      totalResourceConstraints: constraintCount,
    };
  }),
});
