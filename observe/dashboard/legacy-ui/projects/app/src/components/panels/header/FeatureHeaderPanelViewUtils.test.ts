import { FeatureType } from 'generated/graphql';
import { targetMatrixMember } from './FeatureHeaderPanelViewUtils';

describe('targetMatrixMember', () => {
  it('should return false if the matrix is undefined', () => {
    expect(
      targetMatrixMember(undefined, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Boolean,
      }),
    ).toBe(false);
  });

  it('should return false if the matrix is empty', () => {
    expect(
      targetMatrixMember([], {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Boolean,
      }),
    ).toBe(false);
  });

  it('should return true if the matrix member is the same as the feature name', () => {
    const matrix = ['test'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Boolean,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is a wildcard', () => {
    const matrix = ['*'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Boolean,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is a discrete group', () => {
    const matrix = ['group:input'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'discrete',
        inferredDataType: FeatureType.Boolean,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is a discrete group and the feature is discrete', () => {
    const matrix = ['group:discrete'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'discrete',
        inferredDataType: FeatureType.Boolean,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is a continuous group and the feature is continuous', () => {
    const matrix = ['group:continuous'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Fraction,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is a boolean group and the feature is boolean', () => {
    const matrix = ['group:bool'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Boolean,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is an integer group and the feature is an integer', () => {
    const matrix = ['group:int'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Integer,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is a string group and the feature is a string', () => {
    const matrix = ['group:str'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Text,
      }),
    ).toBe(true);
  });

  it('should return true if the matrix member is a fraction group and the feature is a fraction', () => {
    const matrix = ['group:frac'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Fraction,
      }),
    ).toBe(true);
  });

  it('should return false when no conditionals are met', () => {
    const matrix = ['anything'];
    expect(
      targetMatrixMember(matrix, {
        name: 'test',
        inferredType: 'non-discrete',
        inferredDataType: FeatureType.Fraction,
      }),
    ).toBe(false);
  });
});
