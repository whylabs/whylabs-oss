import { IDropdownItem } from 'components/chip-filter/ChipFilter';
import {
  GetFilteredFeaturesWithNameQuery,
  GetFilteredFeaturesWithNameQueryVariables,
  useGetFilteredFeaturesWithNameLazyQuery,
} from 'generated/graphql';
import { useEffect, useState } from 'react';
import { LazyQueryResult, QueryLazyOptions } from '@apollo/client';

function createDropdownItems(features: GetFilteredFeaturesWithNameQuery | undefined): IDropdownItem[] {
  if (!features?.model?.filteredFeatures) return [];

  const { filteredFeatures, filteredOutputs } = features.model;

  const mappedFeatures = filteredFeatures.results.map((feature) => ({
    autoSelect: false,
    disabled: false,
    label: feature.name,
    value: feature.name,
  }));
  const mappedOutputs = filteredOutputs.results.map((output) => ({
    autoSelect: false,
    disabled: false,
    label: output.name,
    value: output.name,
  }));

  return [...mappedFeatures, ...mappedOutputs];
}

type UseGetProfilesChipFilterDataReturnType = {
  chipFilterItems: IDropdownItem[];
  setChipFilterItems: React.Dispatch<React.SetStateAction<IDropdownItem[]>>;
  getFilteredFeatures: (options?: QueryLazyOptions<GetFilteredFeaturesWithNameQueryVariables> | undefined) => void;
  chipFilterFetchData: LazyQueryResult<GetFilteredFeaturesWithNameQuery, GetFilteredFeaturesWithNameQueryVariables>;
};

export default function useGetProfilesChipFilterData(): UseGetProfilesChipFilterDataReturnType {
  const [getFilteredFeatures, originalData] = useGetFilteredFeaturesWithNameLazyQuery();

  const [allDropdownItems, setAllDropdownItems] = useState<IDropdownItem[]>([]);

  useEffect(() => {
    const formattedDropdownItems = createDropdownItems(originalData.data);
    setAllDropdownItems(formattedDropdownItems);
  }, [originalData]);

  return {
    chipFilterItems: allDropdownItems,
    setChipFilterItems: setAllDropdownItems,
    getFilteredFeatures,
    chipFilterFetchData: originalData,
  };
}
