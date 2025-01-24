import { JSONObject } from 'types/genericTypes';
import { ResourceState } from 'pages/model-page/context/ResourceContext';
import { MonitorSchema } from 'monitor-schema-types';
import { useState } from 'react';
import { customJsonAnalyzerPresetsMapper, customJsonMonitorPresetsMapper } from './index';
import { JsonPresets, ProgrammaticChange } from './types';
import { emptyAnalyzerPreset } from './base-configs/freeCreationFlowPreset';
import { handleQuotes, handleProgrammaticReplace, handleBaseConfig, getPresetName } from './jsonPresetHandlerUtils';
import { genericMonitorPreset } from './base-configs/monitorPreset';

type HookReturnType = {
  handleJsonCode: (id: string, monitorSchema?: MonitorSchema) => string;
  displayName?: string;
};
export const useJsonPresetCode = (isEdit: boolean, resourceState: ResourceState): HookReturnType => {
  const { resource } = resourceState;
  const [displayNameState, setDisplayNameState] = useState<string>();
  const replaceProgrammaticFields = (baseConfig: JSONObject, tokens: ProgrammaticChange[]): string => {
    let config = JSON.stringify(baseConfig, null, 4);
    tokens.forEach((token) => {
      config = config.replace(handleQuotes(token), handleProgrammaticReplace(token, resource));
    });
    return config;
  };

  const handlePresetCode = (presetId: JsonPresets): string => {
    const analyzerPreset = customJsonAnalyzerPresetsMapper.get(presetId) ?? emptyAnalyzerPreset;
    const monitorPreset = customJsonMonitorPresetsMapper.get(presetId) ?? genericMonitorPreset;
    setDisplayNameState(getPresetName(presetId));
    const baseConfig = handleBaseConfig(
      monitorPreset.baseConfig,
      analyzerPreset.baseConfig,
      analyzerPreset.displayName,
    );
    return replaceProgrammaticFields(baseConfig, [
      ...monitorPreset.programmaticChanges,
      ...analyzerPreset.programmaticChanges,
    ]);
  };

  const handleEditingConfig = (monitorSchema: MonitorSchema, monitorId: string): string => {
    const monitor = (monitorSchema?.monitors.find((m) => m.id === monitorId) ?? {}) as JSONObject;
    const analyzer = (monitorSchema?.analyzers.find(
      (a) => Array.isArray(monitor?.analyzerIds) && a.id === monitor.analyzerIds[0],
    ) ?? {}) as JSONObject;
    if (Object.keys(monitor).length && Object.keys(analyzer).length) {
      const displayName = typeof monitor?.displayName === 'string' ? monitor?.displayName : monitor.id?.toString();
      setDisplayNameState(`Editing "${displayName || 'monitor'}"`);
      return JSON.stringify(handleBaseConfig(monitor, analyzer, displayName, true), null, 4);
    }
    setDisplayNameState('Monitor config not found');
    return '{}';
  };

  const handleJsonCode = (passedId: string, monitorSchema?: MonitorSchema): string => {
    if (isEdit && monitorSchema) {
      return handleEditingConfig(monitorSchema, passedId);
    }
    return handlePresetCode(passedId as JsonPresets);
  };

  return {
    handleJsonCode,
    displayName: displayNameState,
  };
};
