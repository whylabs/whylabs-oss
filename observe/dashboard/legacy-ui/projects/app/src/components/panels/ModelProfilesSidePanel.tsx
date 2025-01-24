import { IFilterState } from 'components/chip-filter/ChipFilter';
import { useCallback } from 'react';
import { ApolloError } from '@apollo/client';
import ProfilesSidePanelFilter from './ProfilesSidePanel/ProfilesSidePanelFilter';
import ProfilesSidePanel from './ProfilesSidePanel/ProfilesSidePanel';

export interface ModelProfilesSidePanelProps {
  readonly modelId: string;
  setFilter: React.Dispatch<React.SetStateAction<IFilterState>>;
  memoizedFilterState: IFilterState;
  loading: boolean;
  error: ApolloError | undefined;
  threeProfilesAutoSelect: boolean;
  setThreeProfilesAutoSelect: (isTrue: boolean) => void;
  closeFeaturePanel: () => void;
}

export function ModelProfilesSidePanel({
  modelId,
  setFilter,
  memoizedFilterState,
  loading,
  error,
  threeProfilesAutoSelect,
  setThreeProfilesAutoSelect,
  closeFeaturePanel,
}: ModelProfilesSidePanelProps): JSX.Element {
  const onSetFilter = useCallback(() => {
    setFilter({
      ...memoizedFilterState,
    });
  }, [memoizedFilterState, setFilter]);

  if (error) {
    console.error(error);
  }

  return (
    <>
      <ProfilesSidePanelFilter setFilter={setFilter} modelId={modelId} />
      <ProfilesSidePanel
        onSetFilter={onSetFilter}
        threeProfilesAutoSelect={threeProfilesAutoSelect}
        setThreeProfilesAutoSelect={setThreeProfilesAutoSelect}
        profileQueryLoading={loading}
        closeFeaturePanel={closeFeaturePanel}
      />
    </>
  );
}
