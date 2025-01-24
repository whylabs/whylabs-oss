import { translateJsonObject } from 'utils/JsonUtils';
import {
  getPresetName,
  handleBaseConfig,
  handleProgrammaticReplace,
  handleQuotes,
} from '../presets/jsonPresetHandlerUtils';
import { NO_PRESET_ID, ProgrammaticChange, REPLACE_REQUIRED_TOKEN } from '../presets/types';
import { emptyAnalyzerPreset } from '../presets/base-configs/freeCreationFlowPreset';
import { lateUploadPreset } from '../presets/base-configs/data-availability';
import { genericMonitorPreset } from '../presets/base-configs/monitorPreset';
import { dailyModelMock, hourlyModelMock, monthlyModelMock, weeklyModelMock } from './mocks';

describe('Testing handleBaseConfig', () => {
  it('Should handle correct preset configuration', () => {
    const result = handleBaseConfig(
      genericMonitorPreset.baseConfig,
      lateUploadPreset.baseConfig,
      lateUploadPreset.displayName,
    );
    const monitor = Array.isArray(result.monitors) ? translateJsonObject(result.monitors[0]) : {};
    expect(result.monitors).toHaveLength(1);
    expect(result.analyzers).toHaveLength(1);
    // regex to match a phrase finishing with hyphen and a number
    expect(monitor?.displayName).toMatch(/^[\w\s-]+-\d+$/);
  });
  it('Should handle correct editing configuration', () => {
    const result = handleBaseConfig(
      genericMonitorPreset.baseConfig,
      lateUploadPreset.baseConfig,
      lateUploadPreset.displayName,
      true,
    );
    const monitor = Array.isArray(result.monitors) ? translateJsonObject(result.monitors[0]) : {};
    expect(result.monitors).toHaveLength(1);
    expect(result.analyzers).toHaveLength(1);
    // regex to match a phrase
    expect(monitor?.displayName).toMatch(/^[\w\s-]+$/);
  });
  it('Should handle correct preset without display name', () => {
    const result = handleBaseConfig(genericMonitorPreset.baseConfig, lateUploadPreset.baseConfig);
    const monitor = Array.isArray(result.monitors) ? translateJsonObject(result.monitors[0]) : {};
    expect(result.monitors).toHaveLength(1);
    expect(result.analyzers).toHaveLength(1);
    expect(monitor?.displayName).toEqual(REPLACE_REQUIRED_TOKEN);
  });
});

describe('Testing handleQuotes', () => {
  it('Should wrap string in double quotes', () => {
    const result = handleQuotes('test');
    expect(result).toBe('"test"');
  });
  it('Should wrap empty string in double quotes', () => {
    const result = handleQuotes('');
    expect(result).toBe('""');
  });
});

describe('Testing getPresetName', () => {
  it('Should get correct name for NO_PRESET_ID', () => {
    const result = getPresetName(NO_PRESET_ID);
    expect(result).toBe(emptyAnalyzerPreset.presetName);
  });
  it('Should get correct name for not found preset', () => {
    // @ts-expect-error - testing non-existent preset
    const result = getPresetName('non-existent-preset');
    expect(result).toBe(emptyAnalyzerPreset.presetName);
  });
  it('Should handle correct preset name', () => {
    const result = getPresetName('late-upload-analyzer');
    expect(result).toBe(`Configuring the preset "${lateUploadPreset.presetName}"`);
  });
});

describe('Testing handleProgrammaticReplace', () => {
  it('Should return REPLACE_REQUIRED_TOKEN for non-handled tokens', () => {
    const result = handleProgrammaticReplace('not-exists' as ProgrammaticChange, null);
    expect(result).toBe(`"${REPLACE_REQUIRED_TOKEN}"`);
  });
  it.each([
    ['hourly', '"hourly"', hourlyModelMock],
    ['daily', '"daily"', dailyModelMock],
    ['weekly', '"weekly"', weeklyModelMock],
    ['monthly', '"monthly"', monthlyModelMock],
  ])('Should get correct value for $auto_fill_cadence token in a %p batchFrequency', (t, expected, model) => {
    const result = handleProgrammaticReplace('$auto_fill_cadence', model);
    expect(result).toBe(expected);
  });

  it.each([
    ['hourly', '"P7D"', hourlyModelMock],
    ['daily', '"P7D"', dailyModelMock],
    ['weekly', '"P14D"', weeklyModelMock],
    ['monthly', '"P45D"', monthlyModelMock],
  ])(
    'Should get correct value for $auto_fill_dataset_timestamp_offset token %p batchFrequency',
    (t, expected, model) => {
      const result = handleProgrammaticReplace('$auto_fill_dataset_timestamp_offset', model);
      expect(result).toBe(expected);
    },
  );

  it.each([
    ['hourly', '3600', hourlyModelMock],
    ['daily', '86400', dailyModelMock],
    ['weekly', '604800', weeklyModelMock],
    ['monthly', '2592000', monthlyModelMock],
  ])('Should get correct value for $auto_fill_seconds_batch_worth token %p batchFrequency', (t, expected, model) => {
    const result = handleProgrammaticReplace('$auto_fill_seconds_batch_worth', model);
    expect(result).toBe(expected);
  });
});
