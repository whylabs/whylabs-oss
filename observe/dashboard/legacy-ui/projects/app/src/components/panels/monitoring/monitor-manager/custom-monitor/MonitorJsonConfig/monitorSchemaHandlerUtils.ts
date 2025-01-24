import { translateJsonObject } from 'utils/JsonUtils';
import { JSONArray, JSONObject, JSONValue } from 'types/genericTypes';
import { definitions } from '@whylabs/observatory-app/monitor-schema.json';
import { generateFriendlyName } from 'utils/friendlyNames';
import { MonitorCreationTags } from 'hooks/useCustomMonitor/analyzerTags';

export type ErrorTemplate = `${string}%s${string}`;
export type ConfigType = 'Monitor' | 'Analyzer';
export const translatedDefinitions = translateJsonObject(definitions);

export const checkDefinitionIsJson = (config: JSONObject): boolean => {
  return !!(config.discriminator || config.type === 'object' || config.oneOf);
};

export const getDiscriminatorMappedTypes = (discriminator: JSONObject): [string, JSONValue][] => {
  const mapping = translateJsonObject(discriminator.mapping) ?? {};
  return Object.entries(mapping);
};

export const configJsonKeyByTypeMapper = new Map<ConfigType, string>([
  ['Analyzer', 'analyzers'],
  ['Monitor', 'monitors'],
]);

type ChildConfig = {
  jsonChildSchema: JSONObject | null;
  shouldBeJson: boolean;
};
export const translateChildConfig = (jsonChild: JSONValue): ChildConfig => {
  const jsonChildSchema = translateJsonObject(jsonChild);
  const shouldBeJson = checkDefinitionIsJson(jsonChildSchema ?? {});
  return {
    jsonChildSchema,
    shouldBeJson,
  };
};
const DEFINITION_PATTERN = '#/definitions/';
export const getDefinitionKey = (definition: JSONValue): string => {
  if (typeof definition !== 'string') return '';
  if (!definition.includes(DEFINITION_PATTERN)) return '';
  return definition.replace(DEFINITION_PATTERN, '');
};

export const getRequiredFields = (schemaDefinition: JSONObject, discriminatorName?: string): JSONArray => {
  if (Array.isArray(schemaDefinition.required) && schemaDefinition.required.length) {
    return schemaDefinition.required;
  }
  return discriminatorName ? [discriminatorName] : [];
};

type DiscriminatorConfig = {
  discriminatorName?: string;
  mappedTypes: [string, JSONValue][];
  definitionKey: string;
  childDefinition: JSONObject | null;
};

export const translateDiscriminatorConfig = (
  jsonSchema: JSONObject,
  jsonConfigValue: JSONObject,
): DiscriminatorConfig => {
  const discriminator = translateJsonObject(jsonSchema.discriminator);
  const discriminatorName = discriminator?.propertyName?.toString();
  const mappedTypes = discriminator ? getDiscriminatorMappedTypes(discriminator) : [];
  const refName =
    (discriminatorName && mappedTypes?.find(([name]) => name === jsonConfigValue[discriminatorName])?.[1]) ||
    jsonSchema.$ref;
  const definitionKey = getDefinitionKey(refName);
  const childDefinition = translatedDefinitions && translateJsonObject(translatedDefinitions[definitionKey]);
  return {
    discriminatorName,
    mappedTypes,
    definitionKey,
    childDefinition,
  };
};

export const translateValidMonitorConfig = (
  jsonCode: JSONObject,
  creationFlow = true,
): { analyzers: [JSONObject]; monitors: [JSONObject] } => {
  const analyzerConfig = Array.isArray(jsonCode.analyzers) ? jsonCode.analyzers[0] : jsonCode.analyzers;
  const monitorConfig = Array.isArray(jsonCode.monitors) ? jsonCode.monitors[0] : jsonCode.monitors;
  const generatedId = generateFriendlyName();
  const monitor = mapConfig(monitorConfig, 'Monitor', generatedId, creationFlow);
  const analyzer = mapConfig(analyzerConfig, 'Analyzer', generatedId, creationFlow);
  return {
    analyzers: [analyzer],
    monitors: [monitor],
  };
};

const mapConfig = (config: JSONValue, type: ConfigType, generatedId: string, creationFlow: boolean): JSONObject => {
  const translatedConfig = translateJsonObject(config);
  const blackList = BlackListMapper.get(type);
  const analyzerId = `${generatedId}-analyzer`;
  if (!translatedConfig) return {};
  if (Array.isArray(translatedConfig.tags) && !translatedConfig.tags.includes(MonitorCreationTags.JSON)) {
    translatedConfig.tags.push(MonitorCreationTags.JSON);
  }
  blackList?.forEach((field) => {
    if (field in translatedConfig) {
      delete translatedConfig[field];
    }
  });
  if (type === 'Analyzer') {
    return {
      ...translatedConfig,
      ...(creationFlow ? { id: analyzerId } : {}),
    };
  }
  return {
    ...translatedConfig,
    ...(creationFlow ? { id: generatedId, analyzerIds: [analyzerId] } : {}),
  };
};

export const BlackListMapper = new Map<ConfigType, string[]>([
  ['Monitor', ['metadata']],
  ['Analyzer', ['metadata']],
]);
export const UnnecessaryListMapper = new Map<ConfigType, string[]>([
  ['Monitor', ['id', 'analyzerIds']],
  ['Analyzer', ['id']],
]);
