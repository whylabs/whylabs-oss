import {
  BlackListMapper,
  checkDefinitionIsJson,
  configJsonKeyByTypeMapper,
  getDefinitionKey,
  getDiscriminatorMappedTypes,
  getRequiredFields,
  translateChildConfig,
  translatedDefinitions,
  translateDiscriminatorConfig,
  translateValidMonitorConfig,
  UnnecessaryListMapper,
} from '../monitorSchemaHandlerUtils';
import { diffConfigDefinitionMock, jsonCodeMock } from './mocks';

describe('Testing checkDefinitionIsJson function', () => {
  it('Should return true for definition with discriminator', () => {
    const isObject = checkDefinitionIsJson({ discriminator: {} });
    expect(isObject).toBe(true);
  });

  it('Should return true for definition with type object property', () => {
    const isObject = checkDefinitionIsJson({ type: 'object' });
    expect(isObject).toBe(true);
  });

  it('Should return true for definition with oneOf property', () => {
    const isObject = checkDefinitionIsJson({ oneOf: [] });
    expect(isObject).toBe(true);
  });

  it('Should return false for non objects definition', () => {
    const isObject = checkDefinitionIsJson(diffConfigDefinitionMock.properties.type);
    expect(isObject).toBe(false);
  });
});

describe('Testing getDiscriminatorMappedTypes function', () => {
  it('Should return entries of discriminator mapping object', () => {
    const mappedTypes = getDiscriminatorMappedTypes(diffConfigDefinitionMock.properties.baseline.discriminator);
    expect(mappedTypes).toStrictEqual(
      Object.entries(diffConfigDefinitionMock.properties.baseline.discriminator.mapping),
    );
  });
  it('Should return empty array for a discriminator missing mapping property', () => {
    const mappedTypes = getDiscriminatorMappedTypes({});
    expect(mappedTypes).toStrictEqual([]);
  });
});

describe('Testing configJsonKeyByTypeMapper entries', () => {
  it('Should return correct key for Analyzer type', () => {
    const key = configJsonKeyByTypeMapper.get('Analyzer');
    expect(key).toEqual('analyzers');
  });
  it('Should return correct key for Monitor type', () => {
    const key = configJsonKeyByTypeMapper.get('Monitor');
    expect(key).toEqual('monitors');
  });
});

describe('Testing translateChildConfig function', () => {
  it('Should return correct translated Object with shouldBeJson: true', () => {
    const key = translateChildConfig(diffConfigDefinitionMock.properties.baseline);
    expect(key).toStrictEqual({
      jsonChildSchema: diffConfigDefinitionMock.properties.baseline,
      shouldBeJson: true,
    });
  });
  it('Should return correct translated Object with shouldBeJson: false', () => {
    const key = translateChildConfig(diffConfigDefinitionMock.properties.threshold);
    expect(key).toStrictEqual({
      jsonChildSchema: diffConfigDefinitionMock.properties.threshold,
      shouldBeJson: false,
    });
  });
  it('Should return null translated Object with shouldBeJson: false', () => {
    const key = translateChildConfig(undefined);
    expect(key).toStrictEqual({
      jsonChildSchema: null,
      shouldBeJson: false,
    });
  });
});

describe('Testing getDefinitionKey function', () => {
  it('Should return correct definition key for a refName', () => {
    const key = getDefinitionKey(diffConfigDefinitionMock.properties.mode.$ref);
    expect(key).toEqual('DiffMode');
  });

  it('Should return empty definition key for a null input refName', () => {
    const key = getDefinitionKey(null);
    expect(key).toEqual('');
  });

  it('Should return empty definition key for a undefined input refName', () => {
    const key = getDefinitionKey(undefined);
    expect(key).toEqual('');
  });

  it('Should return empty definition key for a incorrect refName pattern', () => {
    // correct pattern '#/definitions/DefinitionKey'
    const key = getDefinitionKey('definition/DiffMode');
    expect(key).toEqual('');
  });
});

describe('Testing getRequiredFields function', () => {
  it('Should return correct required fields of DiffConfig', () => {
    const required = getRequiredFields(diffConfigDefinitionMock);
    expect(required).toStrictEqual(diffConfigDefinitionMock.required);
  });
  it('Should return only discriminator required field', () => {
    const required = getRequiredFields(diffConfigDefinitionMock.properties.baseline, 'type');
    expect(required).toStrictEqual(['type']);
  });
  it('Should return empty array with empty schemaDefinition', () => {
    const required = getRequiredFields({});
    expect(required).toStrictEqual([]);
  });
  it('Should return empty array with empty discriminator name', () => {
    const required = getRequiredFields(diffConfigDefinitionMock.properties.baseline, '');
    expect(required).toStrictEqual([]);
  });
  it('Should return empty array with undefined discriminator name', () => {
    const required = getRequiredFields(diffConfigDefinitionMock.properties.baseline);
    expect(required).toStrictEqual([]);
  });
});

describe('Testing translateDiscriminatorConfig function', () => {
  it('Testing with invalid discriminator name', () => {
    const result = translateDiscriminatorConfig(diffConfigDefinitionMock.properties.baseline, { type: 'Foo' });
    expect(result).toStrictEqual({
      discriminatorName: 'type',
      mappedTypes: Object.entries(diffConfigDefinitionMock.properties.baseline.discriminator.mapping),
      definitionKey: '',
      childDefinition: null,
    });
  });
  it('Testing with TrailingWindow discriminator', () => {
    const result = translateDiscriminatorConfig(diffConfigDefinitionMock.properties.baseline, {
      type: 'TrailingWindow',
    });
    expect(result).toStrictEqual({
      discriminatorName: 'type',
      mappedTypes: Object.entries(diffConfigDefinitionMock.properties.baseline.discriminator.mapping),
      definitionKey: 'TrailingWindowBaseline',
      childDefinition: translatedDefinitions?.TrailingWindowBaseline,
    });
  });
  it('Testing with empty config', () => {
    const result = translateDiscriminatorConfig(diffConfigDefinitionMock.properties.baseline, {});
    expect(result).toStrictEqual({
      discriminatorName: 'type',
      mappedTypes: Object.entries(diffConfigDefinitionMock.properties.baseline.discriminator.mapping),
      definitionKey: '',
      childDefinition: null,
    });
  });
  it('Testing with missing discriminator property', () => {
    const result = translateDiscriminatorConfig(diffConfigDefinitionMock.properties.baseline, {
      wrongDiscriminator: 'TrailingWindow',
    });
    expect(result).toStrictEqual({
      discriminatorName: 'type',
      mappedTypes: Object.entries(diffConfigDefinitionMock.properties.baseline.discriminator.mapping),
      definitionKey: '',
      childDefinition: null,
    });
  });
  it('Testing with $ref and no discriminator', () => {
    const result = translateDiscriminatorConfig(diffConfigDefinitionMock.properties.thresholdType, {
      type: 'ThresholdType',
    });
    expect(result).toStrictEqual({
      discriminatorName: undefined,
      mappedTypes: [],
      definitionKey: 'ThresholdType',
      childDefinition: translatedDefinitions?.ThresholdType,
    });
  });
  it('Testing with empty schema', () => {
    const result = translateDiscriminatorConfig(
      {},
      {
        type: 'Empty',
      },
    );
    expect(result).toStrictEqual({
      discriminatorName: undefined,
      mappedTypes: [],
      definitionKey: '',
      childDefinition: null,
    });
  });
});

describe('Testing translateValidMonitorConfig function', () => {
  it('Testing translateValidMonitorConfig and mapConfig on creation flow', () => {
    const result = translateValidMonitorConfig(jsonCodeMock);
    const translatedAnalyzer = result.analyzers[0];
    const translatedMonitor = result.monitors[0];
    expect(result).toHaveProperty('analyzers');
    expect(result).toHaveProperty('monitors');
    expect(result.analyzers).toHaveLength(1);
    expect(result.monitors).toHaveLength(1);
    expect(Object.keys(translatedAnalyzer)).toStrictEqual(['id', 'schedule', 'targetMatrix', 'config', 'tags']);
    expect(Object.keys(translatedMonitor)).toStrictEqual([
      'id',
      'schedule',
      'mode',
      'displayName',
      'severity',
      'analyzerIds',
      'actions',
      'tags',
    ]);
    expect(translatedMonitor.id).not.toEqual(jsonCodeMock.monitors[0].id);
    expect(translatedMonitor.analyzerIds).not.toStrictEqual(jsonCodeMock.monitors[0].analyzerIds);
    expect(translatedAnalyzer.id).not.toEqual(jsonCodeMock.analyzers[0].id);
  });
  it('Testing translateValidMonitorConfig and mapConfig on edit flow', () => {
    const result = translateValidMonitorConfig(jsonCodeMock, false);
    const translatedAnalyzer = result.analyzers[0];
    const translatedMonitor = result.monitors[0];
    expect(result).toHaveProperty('analyzers');
    expect(result).toHaveProperty('monitors');
    expect(result.analyzers).toHaveLength(1);
    expect(result.monitors).toHaveLength(1);
    expect(Object.keys(translatedAnalyzer)).toStrictEqual(['id', 'schedule', 'targetMatrix', 'config', 'tags']);
    expect(Object.keys(translatedMonitor)).toStrictEqual([
      'id',
      'schedule',
      'mode',
      'displayName',
      'severity',
      'analyzerIds',
      'actions',
      'tags',
    ]);
    expect(translatedMonitor.id).toEqual(jsonCodeMock.monitors[0].id);
    expect(translatedMonitor.analyzerIds).toStrictEqual(jsonCodeMock.monitors[0].analyzerIds);
    expect(translatedAnalyzer.id).toEqual(jsonCodeMock.analyzers[0].id);
  });
  it('Testing translateValidMonitorConfig and mapConfig with invalid configuration input', () => {
    const result = translateValidMonitorConfig({});
    expect(result).toStrictEqual({ analyzers: [{}], monitors: [{}] });
  });
});

describe('Testing fields mappers', () => {
  it.each([
    ['BlackListMapper', 'Monitor', BlackListMapper, ['metadata']],
    ['BlackListMapper', 'Analyzer', BlackListMapper, ['metadata']],
    ['UnnecessaryListMapper', 'Monitor', UnnecessaryListMapper, ['id', 'analyzerIds']],
    ['UnnecessaryListMapper', 'Analyzer', UnnecessaryListMapper, ['id']],
  ])('Testing %p of %p tags', (t, key, mapper, tags) => {
    // @ts-expect-error - key is not ConfigType
    const result = mapper.get(key);
    expect(result).toStrictEqual(tags);
  });
});
