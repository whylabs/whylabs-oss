import { AssetCategory } from 'generated/graphql';

export function makeResourceFilterFunction(isModel: boolean): (r: AssetCategory | undefined | null) => boolean {
  return isModel ? (r) => r === AssetCategory.Model || r === AssetCategory.Llm : (r) => r === AssetCategory.Data;
}
