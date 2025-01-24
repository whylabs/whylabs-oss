import { Analyzer, EntitySchema, EntityWeights, Granularity, Monitor } from 'generated/monitor-schema';

/**
 * Type reference
 *    https://whylabs.gitlab.io/core/monitor-schema/autoapi/monitor_schema/index.html
 */
export type MonitorSchema = {
  id?: string; // Is of type uuid.UUID in java
  schemaVersion?: 1; // In docs its represented as Literal[1] I'm assuming this will always be 1
  orgId: string;
  datasetId: string;
  granularity: Granularity;
  entitySchema: EntitySchema;
  weightConfig?: EntityWeights;
  analyzers: Analyzer[];
  monitors: Monitor[];
};
