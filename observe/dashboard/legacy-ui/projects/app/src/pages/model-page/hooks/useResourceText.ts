import { AssetCategory, ModelType } from 'generated/graphql';
import { CategoryKeys, GetDisplayTextProps, TextRecord } from 'strings/types';
import { useResourceContext } from './useResourceContext';

type UseResourceTextReturn<T> = {
  resourceTexts: T;
  category: CategoryKeys;
  isDataCategory: boolean;
  isDataTransform: boolean;
  isModelCategory: boolean;
  isLLMCategory: boolean;
  loading: boolean;
};

export function useResourceText<T extends TextRecord>(
  texts: GetDisplayTextProps<T>['texts'],
): UseResourceTextReturn<T> {
  const { resourceState, loading } = useResourceContext();
  // Defaults to Model texts
  const category = resourceState.resource?.category ?? AssetCategory.Model;
  const isDataCategory = category === AssetCategory.Data;
  const isDataTransform = isDataCategory && resourceState.resource?.type === ModelType.DataTransform;
  const isModelCategory = [AssetCategory.Model, AssetCategory.Llm].includes(category); // Keep LLM here to don't break current UI
  const isLLMCategory = category === AssetCategory.Llm;

  return {
    resourceTexts: texts[category],
    category,
    isDataCategory,
    isDataTransform,
    isModelCategory,
    isLLMCategory,
    loading,
  };
}
