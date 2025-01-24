import { ChipFilter, IFilterState } from 'components/chip-filter/ChipFilter';
import { FILTER_CHECKBOXES_INFERED } from 'components/chip-filter/constants';
import { Colors } from '@whylabs/observatory-lib';
import useGetProfilesChipFilterData from 'pages/model-page/hooks/useGetProfilesChipFilterData';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

const COMPONENT_TEXTS = {
  DATA: {
    checkboxPopupTitle: 'Filter columns',
    selectedTitle: 'Selected Columns',
    title: 'Column search',
    tooltipSearch: 'Search for columns by name',
    tooltipSelectedFeatures: 'Batch profiles compared',
  },
  MODEL: {
    checkboxPopupTitle: 'Filter inputs and outputs',
    selectedTitle: 'Selected Columns',
    title: 'Column search',
    tooltipSearch: 'Search for inputs and outputs by name',
    tooltipSelectedFeatures: 'Batch profiles compared',
  },
  LLM: {
    checkboxPopupTitle: 'Filter metrics',
    selectedTitle: 'Selected Metrics',
    title: 'Metric search',
    tooltipSearch: 'Search for metrics by name',
    tooltipSelectedFeatures: 'Batch profiles compared',
  },
};

interface ProfilesSidePanelFilterProps {
  setFilter: React.Dispatch<React.SetStateAction<IFilterState>>;
  modelId: string;
}

export default function ProfilesSidePanelFilter({ setFilter, modelId }: ProfilesSidePanelFilterProps): JSX.Element {
  const { resourceTexts } = useResourceText(COMPONENT_TEXTS);
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { chipFilterItems, setChipFilterItems, getFilteredFeatures, chipFilterFetchData } =
    useGetProfilesChipFilterData();

  function handleChipFilterSearchTextChange(searchText: string) {
    if (searchText === '') {
      setChipFilterItems([]);
      return;
    }

    if (loadingDateRange) return;

    getFilteredFeatures({
      variables: {
        featureFilter: {
          substring: searchText,
        },
        modelId,
        offset: 0, // TODO: Maybe load more option should be added?
        limit: 100, // TODO: Maybe number of features in drodpwon should increase?
        ...dateRange,
      },
    });
  }

  return (
    <ChipFilter
      loading={chipFilterFetchData.loading}
      dropdownData={chipFilterItems}
      checkboxList={FILTER_CHECKBOXES_INFERED}
      onChange={(value: string) => handleChipFilterSearchTextChange(value)}
      onApply={(filterState) => setFilter(filterState)}
      checkboxPopupTitle={resourceTexts.checkboxPopupTitle}
      customStyles={{
        root: { backgroundColor: Colors.brandSecondary100 },
        input: { backgroundColor: Colors.brandSecondary100 },
      }}
      selectedTitle={resourceTexts.selectedTitle}
      title={resourceTexts.title}
      tooltip={{
        search: resourceTexts.tooltipSearch,
        selectedFeatures: resourceTexts.tooltipSelectedFeatures,
      }}
    />
  );
}
