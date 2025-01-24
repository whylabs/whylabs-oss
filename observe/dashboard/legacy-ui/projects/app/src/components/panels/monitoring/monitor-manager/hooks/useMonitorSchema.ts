import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import { useRecoilState } from 'recoil';
import { useState, useEffect, useCallback } from 'react';
import {
  useGetBatchFrequencyQuery,
  useGetMonitorConfigQuery,
  useGetUserQuery,
  useUpdateMonitorMutation,
  useDeleteMonitorMutation,
  useDeleteAnalyzerMutation,
  usePatchMonitorConfigMutation,
} from 'generated/graphql';
import { MonitorSchema } from 'monitor-schema-types';
import { Maybe } from 'graphql/jsutils/Maybe';
import { Monitor } from 'generated/monitor-schema';
import { ApolloError } from '@apollo/client';
import { cloneDeep } from '@apollo/client/utilities';
import { timePeriodToGranularity } from 'adapters/monitor-adapters';
import { sleepAsync } from '@whylabs/observatory-lib';
import { isNotNullish } from 'utils/nullUtils';
import { NewMonitorAndAnalyzer } from 'hooks/useCustomMonitor/useCustomMonitor';
import { stringToSchema } from 'utils/schemaUtils';

interface MonitorSchemaReturn {
  monitorSchema: MonitorSchema | undefined;
  queryLoading: boolean;
  error: ApolloError | undefined;
  updateMonitorAndAnalyzer: (newMonitorAndAnalyzer: NewMonitorAndAnalyzer) => Promise<void>;
  deleteMonitorAndAnalyzer: (monitorId?: string, analyzerId?: string) => Promise<void>;
  updateMonitor: (monitorId: string, monitor: Monitor) => Promise<void>;
  refetchSchema: () => Promise<void>;
}

interface MonitorSchemaProps {
  modelId: string;
}

/**
 * This delay is necessary to reduce the risk of monitor and analyzer changes stomping over each other.
 * Even waiting for one of the requests to finish is not sufficient, because we store the configs in S3 and
 * S3 does not provide strong enough consistency guarantees to allow us to immediately update the config again
 */
async function preventRaceConditions(): Promise<void> {
  await sleepAsync(500);
}

export default function useMonitorSchema({ modelId }: MonitorSchemaProps): MonitorSchemaReturn {
  const {
    data: initialData,
    loading: initialLoading,
    error: initialError,
    refetch: refetchConfig,
  } = useGetMonitorConfigQuery({ variables: { modelId } });
  const [monitorSchema, setMonitorSchemaState] = useState<MonitorSchema | undefined>(undefined);
  const [updateSpecificMonitor] = useUpdateMonitorMutation();
  const [patchConfig] = usePatchMonitorConfigMutation();
  const [deleteSpecificMonitor] = useDeleteMonitorMutation();
  const [deleteSpecificAnalyzer] = useDeleteAnalyzerMutation();
  const { refetch: fetchUser } = useGetUserQuery({ skip: true });
  const { refetch: fetchBatchFrequency } = useGetBatchFrequencyQuery({ skip: true });
  const [defaultSchemaLoading, setDefaultSchemaLoading] = useState(false);
  const [, setIsEmptyMonitor] = useRecoilState(emptyMonitorAtom);

  const stringToSchemaCallback = useCallback(stringToSchema, []);

  const generateDefaultSchema = useCallback(async () => {
    setDefaultSchemaLoading(true);
    const requests = await Promise.allSettled([fetchUser(), fetchBatchFrequency({ modelId })]);
    setDefaultSchemaLoading(false);

    const userData = requests[0].status === 'fulfilled' ? requests[0].value.data : undefined;
    const modelData = requests[1].status === 'fulfilled' ? requests[1].value.data : undefined;
    if (!userData?.user.organization?.id || !modelData?.model?.batchFrequency) return undefined;

    return {
      schemaVersion: 1,
      orgId: userData.user.organization.id,
      datasetId: modelId,
      granularity: timePeriodToGranularity(modelData.model.batchFrequency),
      entitySchema: {
        columns: {},
      },
      analyzers: [],
      monitors: [],
    } as MonitorSchema;
  }, [modelId, fetchUser, fetchBatchFrequency]);

  const setMonitorSchema = useCallback(
    (maybeSchema: Maybe<string> | MonitorSchema) => {
      if (maybeSchema === null || maybeSchema === undefined) {
        setMonitorSchemaState(undefined);
        return;
      }

      if (typeof maybeSchema === 'string') {
        const schema = stringToSchemaCallback(maybeSchema);
        setMonitorSchemaState(schema);
        return;
      }

      setMonitorSchemaState(maybeSchema);
    },
    [stringToSchemaCallback],
  );

  async function updateMonitor(monitorId: string, monitor: Monitor) {
    const config = JSON.stringify(monitor);

    try {
      const { data, errors } = await updateSpecificMonitor({ variables: { monitorId, config, modelId } });
      if (!data?.monitorSettings || errors) throw Error('Failed to update monitor schema');

      const clonedSchema = cloneDeep(monitorSchema);
      if (!clonedSchema) {
        console.log('Failed to update local state after updating monitor');
        return;
      }

      const index = clonedSchema?.monitors.findIndex((m) => m.id === monitorId) ?? -1;
      clonedSchema.monitors[index] = monitor;
      setMonitorSchema(clonedSchema);
    } catch (err) {
      console.log('Failed to update monitor, monitor:', monitor);
      throw err;
    }
  }

  /**
   * clones in-memory schema state and updates it via the provided function
   */
  function updateSchemaState(
    update: (clonedSchema: Readonly<MonitorSchema> | undefined) => MonitorSchema | undefined,
  ): void {
    const clonedSchema = cloneDeep(monitorSchema);
    setMonitorSchema(update(clonedSchema));
  }

  async function updateMonitorAndAnalyzer({ monitor, analyzer }: NewMonitorAndAnalyzer) {
    const monitorId = monitor.id || '';
    const analyzerId = analyzer.id || '';
    const partialConfig = {
      monitors: [monitor],
      analyzers: [analyzer],
    };
    const strPartialConfig = JSON.stringify(partialConfig);

    try {
      await patchConfig({
        variables: { config: strPartialConfig, modelId },
      });

      updateSchemaState((clonedSchema) => {
        if (clonedSchema) {
          return {
            ...clonedSchema,
            monitors: clonedSchema.monitors.map((originalMonitor) =>
              originalMonitor.id !== monitorId ? originalMonitor : monitor,
            ),
            analyzers: clonedSchema.analyzers.map((originalAnalyzer) =>
              originalAnalyzer.id !== analyzerId ? originalAnalyzer : analyzer,
            ),
          };
        }
        return undefined;
      });
    } catch (err) {
      console.log('Failed to update monitor or analyzer.', monitor, analyzer);
      throw err;
    }
  }

  async function deleteMonitorAndAnalyzer(monitorId?: string, analyzerId?: string) {
    try {
      if (analyzerId) {
        await deleteSpecificAnalyzer({
          variables: { datasetId: modelId, analyzerId },
        });

        await preventRaceConditions();
      }

      if (monitorId) {
        await deleteSpecificMonitor({
          variables: { datasetId: modelId, monitorId },
        });
      }

      updateSchemaState((clonedSchema) => {
        if (clonedSchema) {
          return {
            ...clonedSchema,
            monitors: clonedSchema.monitors.map((m) => (m.id !== monitorId ? m : null)).filter(isNotNullish),
            analyzers: clonedSchema.analyzers.map((a) => (a.id !== analyzerId ? a : null)).filter(isNotNullish),
          };
        }
        return undefined;
      });
    } catch (err) {
      console.log('Failed to delete monitor or analyzer.', monitorId, analyzerId);
      throw err;
    }
  }

  async function refetchSchema() {
    const { data, errors } = await refetchConfig();
    if (!data?.monitorConfig || errors) {
      console.error('Error refetching schema');
      return;
    }
    setMonitorSchema(data.monitorConfig);
  }

  useEffect(() => {
    if (initialLoading) return;

    if (initialData?.monitorConfig === '{}') {
      generateDefaultSchema().then((schema) => setMonitorSchema(schema));
    } else {
      const schema = stringToSchemaCallback(initialData?.monitorConfig);
      setMonitorSchema(schema);
      setIsEmptyMonitor(schema ? schema.monitors.length === 0 : false);
    }
  }, [stringToSchemaCallback, initialData, initialLoading, setMonitorSchema, generateDefaultSchema, setIsEmptyMonitor]);

  return {
    monitorSchema,
    queryLoading: initialLoading || defaultSchemaLoading,
    error: initialError,
    updateMonitorAndAnalyzer,
    deleteMonitorAndAnalyzer,
    updateMonitor,
    refetchSchema,
  };
}
