import { convertToDisplayString, getCardLayoutTypeFromDimensions } from '../execDashHelpers';

describe('DashCard helper tests', () => {
  it('finds the correct default type with invalid data', () => {
    expect(getCardLayoutTypeFromDimensions(0, 4)).toBe('chip');
    expect(getCardLayoutTypeFromDimensions(5, -1)).toBe('chip');
  });

  it('identifies the expected card types', () => {
    expect(getCardLayoutTypeFromDimensions(1, 1)).toBe('chip');
    expect(getCardLayoutTypeFromDimensions(1, 2)).toBe('horizontal');
    expect(getCardLayoutTypeFromDimensions(2, 1)).toBe('vertical');
    expect(getCardLayoutTypeFromDimensions(2, 3)).toBe('horizontalGraph');
  });

  it('assigns a horizontal graph display type for all big values', () => {
    expect(getCardLayoutTypeFromDimensions(2, 2)).toBe('horizontalGraph');
    expect(getCardLayoutTypeFromDimensions(100, 45)).toBe('horizontalGraph');
  });
});

describe('Dashcard number display tests', () => {
  it('Displays whole numeric values by default', () => {
    expect(convertToDisplayString(35.5, 0, undefined)).toEqual('36');
  });

  it('Displays numbers as percentages when told to do so', () => {
    expect(convertToDisplayString(0.33789, 1, 'percentage')).toEqual('33.8%');
  });

  it('Just displays numbers for other types', () => {
    // Note: will need to be updated when we handle these types.
    expect(convertToDisplayString(35.5, 1, 'number')).toEqual('35.5');
    expect(convertToDisplayString(35.5, 1, 'date')).toEqual('35.5');
    expect(convertToDisplayString(35.5, 1, 'string')).toEqual('35.5');
  });

  it('Returns null for null input', () => {
    expect(convertToDisplayString(null, 0, undefined)).toBeNull();
  });
});
