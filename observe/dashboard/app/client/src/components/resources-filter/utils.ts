import { SelectItem, createStyles } from '@mantine/core';
import { ListFilterOption } from '~/components/composed-filter/ComposedFilterElement';
import { getCustomTagLabel } from '~/components/tags/UserDefinedTags';
import { ComposedFilterDimension } from '~/hooks/composed-filter/types';
import { CustomTag, ModelType } from '~server/graphql/generated/graphql';
import { ResourceTypeFilterOption } from '~server/services/data/songbird/api-wrappers/resources';

export const dimensionOptions: ComposedFilterDimension[] = [
  {
    label: 'Model type',
    type: 'list',
    value: 'modelType',
    disableCondition: true,
  },
  {
    label: 'Dataset type',
    type: 'list',
    value: 'datasetType',
    disableCondition: true,
  },
  {
    label: 'Not defined',
    type: 'list',
    value: 'notDefined',
    disableCondition: true,
    disableValue: true,
  },
  {
    label: 'Resource tags',
    type: 'list',
    value: 'resourceTags',
    disableCondition: true,
  },
];

export const modelTypes: SelectItem[] = [
  { label: 'Classification model', value: 'classification' },
  { label: 'Embeddings model', value: 'embeddings' },
  { label: 'Large language model (LLM)', value: 'llm' },
  { label: 'Secured LLM', value: 'secured-llm' },
  { label: 'Ranking model', value: 'ranking' },
  { label: 'Regression model', value: 'regression' },
  { label: 'Other model', value: 'model_other' },
];

export const datasetTypes: SelectItem[] = [
  { label: 'Data source', value: 'data_source' },
  { label: 'Data stream', value: 'data_stream' },
  { label: 'Data transform', value: 'data_transform' },
  { label: 'Other dataset', value: 'data_other' },
];

export const mapResourceTypeFilter = new Map<string, ResourceTypeFilterOption>([
  ['classification', ModelType.Classification],
  ['embeddings', ModelType.Embeddings],
  ['llm', ModelType.Llm],
  ['secured-llm', 'secured-llm'],
  ['ranking', ModelType.Ranking],
  ['regression', ModelType.Ranking],
  ['model_other', ModelType.ModelOther],
  ['data_source', ModelType.DataSource],
  ['data_stream', ModelType.DataStream],
  ['data_transform', ModelType.DataTransform],
  ['data_other', ModelType.DataOther],
]);

export const useResourceFilterStyles = createStyles(() => ({
  filtersBadge: {
    borderRadius: '0.25rem',
    fontFamily: 'Inconsolata',
    height: 22,
    '& *': {
      fontFamily: 'Inconsolata',
    },
  },
}));

export type ResourceFilterDimensions = 'modelType' | 'datasetType' | 'notDefined' | 'resourceTags';

export const mapTagsToFilterOptions = (tags: CustomTag[]): ListFilterOption[] => {
  return tags.map(({ key, value, color, backgroundColor }) => {
    const label = getCustomTagLabel({ key, value });
    return {
      label,
      value: label,
      color: color ?? undefined,
      backgroundColor: backgroundColor ?? undefined,
    };
  });
};
