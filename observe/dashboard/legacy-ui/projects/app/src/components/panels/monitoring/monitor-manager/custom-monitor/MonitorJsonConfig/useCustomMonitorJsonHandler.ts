import { useRecoilState } from 'recoil';
import { GenericEditorLineInfo, genericEditorLinesAtom } from 'atoms/genericEditorLinesAtom';
import { definitions } from '@whylabs/observatory-app/monitor-schema.json';
import { merge } from 'lodash';
import { JSONArray, JSONObject, JSONValue } from 'types/genericTypes';
import {
  findLineByJsonKey,
  findLineByJsonPosition,
  getJsonPositionByError,
  translateJsonObject,
} from 'utils/JsonUtils';
import {
  BlackListMapper,
  configJsonKeyByTypeMapper,
  ConfigType,
  ErrorTemplate,
  getRequiredFields,
  translateChildConfig,
  translateDiscriminatorConfig,
  UnnecessaryListMapper,
} from './monitorSchemaHandlerUtils';
import { REPLACE_REQUIRED_TOKEN } from './presets/types';

type ReturnType = {
  isValidSchema: (code: string) => boolean;
};

interface BuildFieldsError {
  fieldsArray: string[];
  fieldKey?: string;
  errorTemplate: ErrorTemplate;
  configType?: ConfigType;
  lineType?: GenericEditorLineInfo['type'];
}
interface Validation {
  json: JSONObject;
  type?: ConfigType;
  errorTemplate: ErrorTemplate;
  fieldKey?: string;
}
interface RequiredValidation extends Validation {
  schemaDefinition: JSONArray;
}

interface ExecuteValidation extends Validation {
  schemaDefinition: JSONObject;
}

export const useCustomMonitorJsonHandler = (uniqueKey: string, isEdit: boolean): ReturnType => {
  let handledLines: GenericEditorLineInfo[] = [];
  let rawCode: string;
  let parsedJson: JSONObject | undefined;
  const [, seLinesState] = useRecoilState(genericEditorLinesAtom);

  const clearContext = () => {
    [handledLines, parsedJson, rawCode] = [[], undefined, ''];
  };

  const updateRecoilState = () => {
    const baseArray = Array.from(Array(rawCode.split('\n').length), () => {
      return {};
    });
    seLinesState((state) => {
      return {
        ...state,
        [uniqueKey]: merge(baseArray, handledLines),
      };
    });
  };

  const handleJsonParse = (code: string) => {
    try {
      rawCode = code;
      parsedJson = JSON.parse(code);
    } catch (err) {
      const position = getJsonPositionByError(err);
      const lineIndex = findLineByJsonPosition(code, position);
      handledLines[lineIndex] = { type: 'error', textContent: 'Invalid JSON syntax' };
    }
  };

  const buildFieldsError = ({
    fieldsArray,
    fieldKey,
    configType = 'Monitor',
    errorTemplate,
    lineType = 'error',
  }: BuildFieldsError): void => {
    if (!fieldsArray.length) return;
    const configKey = configJsonKeyByTypeMapper.get(configType) ?? '';
    const configLineIndex = findLineByJsonKey(rawCode, configKey);
    const fieldLineIndex = findLineByJsonKey(rawCode, fieldKey ?? configKey, configLineIndex);
    const lineIndex = fieldLineIndex > 0 ? fieldLineIndex : 0;
    handledLines[lineIndex] = {
      type: lineType,
      textContent: errorTemplate.replace('%s', fieldsArray.join(', ')),
    };
  };

  const handleMissingRequiredFields = ({
    json,
    schemaDefinition: requiredFields,
    errorTemplate,
    type = 'Monitor',
    fieldKey,
  }: RequiredValidation) => {
    const missingFields: string[] = [];
    const blackList = BlackListMapper.get(type) ?? [];
    const unnecessaryList = UnnecessaryListMapper.get(type) ?? [];
    const avoidFields = isEdit ? [] : [...blackList, ...unnecessaryList];
    requiredFields.forEach((required) => {
      if (typeof required === 'string' && !(required in json) && !avoidFields.includes(required)) {
        missingFields.push(required);
      }
    });
    if (missingFields.length) {
      buildFieldsError({
        fieldsArray: missingFields,
        fieldKey,
        configType: type,
        errorTemplate,
      });
    }
  };

  const isUnknownField = (
    field: string,
    propertiesObject: JSONObject,
    errorTemplate: ErrorTemplate,
    type: ConfigType = 'Monitor',
  ): boolean => {
    const blackList = BlackListMapper.get(type) ?? [];
    const unnecessaryList = UnnecessaryListMapper.get(type) ?? [];
    const avoidFields = isEdit ? [] : [...blackList, ...unnecessaryList];
    const isUnknown = !(field in propertiesObject);
    if (isUnknown || avoidFields.includes(field)) {
      const lineType: GenericEditorLineInfo['type'] = isUnknown ? 'error' : 'info';
      const template = isUnknown ? errorTemplate : 'Field %s is auto-configured. It does not need to be entered.';
      buildFieldsError({
        fieldsArray: [field],
        fieldKey: field,
        configType: type,
        errorTemplate: template,
        lineType,
      });
      return true;
    }
    return false;
  };

  const handleInvalidObjectProperty = (field: string, type?: ConfigType): void => {
    buildFieldsError({
      fieldsArray: [field],
      fieldKey: field,
      configType: type,
      errorTemplate: `Field %s should be an object.`,
    });
  };

  const handleInvalidDiscriminator = (
    field: string,
    discriminatorName: JSONValue,
    mappedTypes: [string, JSONValue][],
    type?: ConfigType,
  ) => {
    if (typeof discriminatorName !== 'string') return;
    buildFieldsError({
      fieldsArray: [field],
      fieldKey: field,
      configType: type,
      errorTemplate: `Field "%s.${discriminatorName}" should be one of [
        ${mappedTypes.map((e) => e[0]).join(' | ')}
      ]`,
      lineType: 'warning',
    });
  };

  const handleChildJsonConfig = (
    fieldKey: string,
    jsonChildSchema: JSONObject,
    childConfig: JSONObject,
    type?: ConfigType,
  ): void => {
    // handling valid objects child config
    const { childDefinition, discriminatorName, definitionKey, mappedTypes } = translateDiscriminatorConfig(
      jsonChildSchema,
      childConfig,
    );
    // handling invalid discriminator
    if (!definitionKey && discriminatorName) {
      handleInvalidDiscriminator(fieldKey, discriminatorName, mappedTypes, type);
    }
    // checking missing required fields
    const requiredFields = getRequiredFields(childDefinition ?? {}, discriminatorName);
    handleMissingRequiredFields({
      json: childConfig,
      type,
      schemaDefinition: requiredFields,
      errorTemplate: `Object ${type}.${fieldKey} is missing fields [%s]${
        definitionKey ? ' for '.concat(definitionKey) : ''
      }`,
      fieldKey,
    });
    if (childDefinition) {
      // recursive call if child is a defined object
      checkPropertyFields({
        json: childConfig,
        schemaDefinition: childDefinition,
        errorTemplate: `%s is not a valid field for an object of type ${definitionKey}`,
        fieldKey,
        type,
      });
    }
  };

  const isRequiredToReplace = (key: string, value: JSONValue, type: ConfigType): boolean => {
    const stringValue = JSON.stringify(value);
    const isNotTopLevel = !['monitors', 'analyzers'].includes(key);
    if (isNotTopLevel && stringValue.includes(REPLACE_REQUIRED_TOKEN)) {
      buildFieldsError({
        fieldsArray: [key],
        fieldKey: key,
        configType: type,
        errorTemplate: `Field %s should be replaced with your respective configuration.`,
        lineType: 'warning',
      });
    }
    return false;
  };

  const checkPropertyFields = ({
    json,
    schemaDefinition,
    errorTemplate,
    type = 'Monitor',
  }: ExecuteValidation): void => {
    if (!schemaDefinition || typeof schemaDefinition !== 'object' || schemaDefinition instanceof Array) return;
    Object.entries(json).forEach(([key, value]) => {
      // checking if this field really exists in the config schema
      const properties = translateJsonObject(schemaDefinition.properties) ?? {};
      if (isUnknownField(key, properties, errorTemplate, type)) {
        return;
      }
      if (isRequiredToReplace(key, value, type)) {
        return;
      }
      const { jsonChildSchema, shouldBeJson } = translateChildConfig(properties[key]);
      if (!shouldBeJson || !jsonChildSchema) return;
      // checking if expected json config is invalid
      const jsonChildJsonConfig = translateJsonObject(value);
      if (!jsonChildJsonConfig) {
        handleInvalidObjectProperty(key, type);
        return;
      }
      // handling child configs with possible recursion
      handleChildJsonConfig(key, jsonChildSchema, jsonChildJsonConfig, type);
    });
  };

  const handleTopLevelValidation = (): void => {
    if (!parsedJson) return;
    const topLevelDefinition = { analyzers: true, monitors: true };
    handleMissingRequiredFields({
      json: parsedJson,
      schemaDefinition: ['monitors', 'analyzers'],
      errorTemplate: `Configuration is missing fields [%s]`,
    });
    checkPropertyFields({
      json: parsedJson,
      schemaDefinition: { properties: topLevelDefinition },
      errorTemplate: `%s is not a valid configuration. Expected 'monitor' or 'analyzer'`,
    });
  };

  const handleConfigValidation = (type: ConfigType): void => {
    const key = configJsonKeyByTypeMapper.get(type) ?? '';
    const schemaDefinition = definitions[type];
    const jsonValue = parsedJson?.[key];
    const jsonObject = Array.isArray(jsonValue) ? jsonValue[0] : jsonValue;
    const json = translateJsonObject(jsonObject);
    if (Array.isArray(schemaDefinition.required) && json) {
      handleMissingRequiredFields({
        json,
        type,
        schemaDefinition: schemaDefinition.required,
        errorTemplate: `Object ${type} is missing fields [%s]`,
      });
    }
    if (typeof schemaDefinition === 'object' && json) {
      checkPropertyFields({
        json,
        type,
        schemaDefinition,
        errorTemplate: `%s is not a valid field for an object of type ${type}`,
      });
    }
  };

  const isValidSchema = (code: string): boolean => {
    clearContext();
    handleJsonParse(code);
    handleTopLevelValidation();
    handleConfigValidation('Analyzer');
    handleConfigValidation('Monitor');
    updateRecoilState();
    return !handledLines.filter((l) => l.type !== 'info').length;
  };

  return { isValidSchema };
};
