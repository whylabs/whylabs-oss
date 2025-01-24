import { AssetCategory } from 'generated/graphql';
import { makeResourceFilterFunction } from '../resourceHelpers';

describe('Testing the functions in resourceHelpers', () => {
  it('should create a function that returns true for models and false for datasets', () => {
    const resourceFilterFunction = makeResourceFilterFunction(true);
    expect(resourceFilterFunction(AssetCategory.Model)).toBe(true);
    expect(resourceFilterFunction(AssetCategory.Llm)).toBe(true);
    expect(resourceFilterFunction(AssetCategory.Data)).toBe(false);
    expect(resourceFilterFunction(null)).toBe(false);
    expect(resourceFilterFunction(undefined)).toBe(false);
  });

  it('should create a function that returns true for datasets and false for models', () => {
    const resourceFilterFunction = makeResourceFilterFunction(false);
    expect(resourceFilterFunction(AssetCategory.Model)).toBe(false);
    expect(resourceFilterFunction(AssetCategory.Llm)).toBe(false);
    expect(resourceFilterFunction(AssetCategory.Data)).toBe(true);
    expect(resourceFilterFunction(null)).toBe(false);
    expect(resourceFilterFunction(undefined)).toBe(false);
  });
});
