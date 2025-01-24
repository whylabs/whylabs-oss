import { timeLong } from 'utils/dateUtils';
import { NumberOrString } from 'utils/queryUtils';
import { ReferenceProfile } from 'generated/graphql';
import { ProfileQueryData, ProfilesSelectionInput } from 'pages/model-page/context/ProfilesPageContext';
import { SelectorRowText, GenericFlexColumnSelectItemData } from 'components/design-system';

function formatBatchProfilesForSelectAutoComplete(
  data: ProfileQueryData,
  profiles: readonly NumberOrString[],
  selectedValue?: string,
  selectionInputs?: ProfilesSelectionInput[],
): GenericFlexColumnSelectItemData[] {
  return data
    .sort((p1, p2) => p2.timestamp - p1.timestamp)
    .map((profile) => {
      const batchAlreadySelected = profiles.includes(profile.timestamp) && Number(selectedValue) !== profile.timestamp;
      const currentBatchSelectionInputs = batchAlreadySelected
        ? selectionInputs?.filter((s) => s.id === profile.timestamp)
        : null;
      const individualProfilesCount = currentBatchSelectionInputs?.[0]?.individualProfilesCount ?? 0;
      const allAvailableOptionsSelected = currentBatchSelectionInputs?.length === individualProfilesCount + 1; // + 1 because of mergedProfile item
      const disabled = individualProfilesCount ? allAvailableOptionsSelected : batchAlreadySelected;
      return {
        label: timeLong(profile.timestamp),
        value: profile.timestamp.toString(),
        disabledTooltip: 'Merged batch profile already selected',
        group: `Merged batch profiles (${data.length})`,
        disabled,
      };
    });
}

function formatStaticProfilesForSelectAutoComplete(
  staticProfiles: ReferenceProfile[],
  profiles: readonly NumberOrString[],
  selectedValue?: string,
): GenericFlexColumnSelectItemData[] {
  if (!staticProfiles) return [];

  return staticProfiles.map((profile) => ({
    label: profile.alias,
    value: profile.id,
    rows: [
      {
        textElementConstructor: (children) => <SelectorRowText type="label">{children}</SelectorRowText>,
        children: profile.alias,
        tooltip: profile.alias,
      },
      {
        textElementConstructor: (children) => <SelectorRowText type="secondary">ID: {children}</SelectorRowText>,
        children: profile.id,
      },
    ],
    disabled: profiles.includes(profile.id) && selectedValue !== profile.id,
    disabledTooltip: 'Static reference profile already selected',
    group: `Static reference profiles (${staticProfiles.length})`,
  }));
}

export const translateProfilesSelectData = (
  data: ProfileQueryData,
  staticProfiles: ReferenceProfile[],
  profiles: readonly NumberOrString[],
  selectedValue?: string,
  selectionInputs?: ProfilesSelectionInput[],
): GenericFlexColumnSelectItemData[] => {
  const adaptedBatchProfiles = formatBatchProfilesForSelectAutoComplete(data, profiles, selectedValue, selectionInputs);
  const adaptedStaticProfiles = formatStaticProfilesForSelectAutoComplete(staticProfiles, profiles, selectedValue);

  return [...adaptedStaticProfiles, ...adaptedBatchProfiles];
};

export const PROFILE_SELECT_LIMIT = 3;
