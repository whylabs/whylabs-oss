import { FeatureBasicData } from 'utils/createFeatureBasicData';
import { FeatureType } from 'generated/graphql';

export function targetMatrixMember(
  matrix: string[] | undefined,
  featureBasicData: Pick<FeatureBasicData, 'name' | 'inferredDataType' | 'inferredType' | 'isOutput'>,
): boolean {
  // If the matrix has not been defined, return false
  if (!matrix?.length) return false;

  const found = matrix.find((m: string) => {
    // If the matrix member is the same as the feature name, return true
    if (m === featureBasicData.name) return true;

    // If the matrix member is a wildcard, return true
    if (m === '*') return true;

    // If the matrix member is the group of all inputs and the feature is an input, return true
    if (m === 'group:input' && !featureBasicData.isOutput) return true;

    // If the matrix member is the group of all outputs and the feature is an output, return true
    if (m === 'group:output' && featureBasicData.isOutput) return true;

    // If the matrix member is a discrete group and the feature is discrete, return true
    if (featureBasicData.inferredType === 'discrete' && m === 'group:discrete') {
      return true;
    }

    // If the matrix member is a continuous group and the feature is continuous, return true
    if (featureBasicData.inferredType === 'non-discrete' && m === 'group:continuous') {
      return true;
    }

    // If the matrix member is a boolean group and the feature is boolean, return true
    if (featureBasicData.inferredDataType === FeatureType.Boolean && m === 'group:bool') {
      return true;
    }

    // If the matrix member is an integer group and the feature is an integer, return true
    if (featureBasicData.inferredDataType === FeatureType.Integer && m === 'group:int') {
      return true;
    }

    // If the matrix member is a string group and the feature is a string, return true
    if (featureBasicData.inferredDataType === FeatureType.Text && m === 'group:str') {
      return true;
    }

    // If the matrix member is a fraction group and the feature is a fraction, return true
    if (featureBasicData.inferredDataType === FeatureType.Fraction && m === 'group:frac') {
      return true;
    }

    return false;
  });

  return !!found;
}
