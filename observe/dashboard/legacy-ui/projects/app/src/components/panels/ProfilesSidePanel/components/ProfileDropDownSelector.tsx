import { useContext, useMemo } from 'react';
import { WhyLabsSelect, WhyLabsButton, WhyLabsTooltip } from 'components/design-system';
import { useSearchProfiles } from 'hooks/useSearchProfiles';
import { NumberOrString } from 'utils/queryUtils';
import { INDIVIDUAL_SEPARATOR } from 'types/navTags';
import { useGetBatchesRangeTimestamps } from 'hooks/useGetBatchesRangeTimestamps';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ProfilesPageContext } from 'pages/model-page/context/ProfilesPageContext';
import { useProfileSidePanelStyles } from '../ProfileSidePanelCSS';
import { useGetIndividualProfiles } from '../hooks/useGetIndividualProfiles';
import { translateProfilesSelectData } from './utils';

interface ProfileDropDownSelectorProps {
  closeFeaturePanel: () => void;
  loading: boolean;
  backgroundColor: string;
  index: number;
  id: NumberOrString;
}

export const ProfileDropDownSelector: React.FC<ProfileDropDownSelectorProps> = ({
  closeFeaturePanel,
  loading,
  backgroundColor,
  index,
  id,
}) => {
  const { classes: styles, cx } = useProfileSidePanelStyles();
  const { modelId } = usePageTypeWithParams();
  const { profiles, rawProfiles, individualProfiles, setProfiles } = useSearchProfiles();
  const { batches } = useGetBatchesRangeTimestamps({
    modelId,
    timestamps: [Number(profiles[index])],
    skip: true,
  });
  const { selectMappedData: individualSelectData } = useGetIndividualProfiles(
    id,
    individualProfiles.filter((_, i) => i !== index),
    batches?.[0],
  );
  const [{ selectionInputs, staticProfiles, profileQueryData }, dispatchSidePanel] = useContext(ProfilesPageContext);
  const hasReferenceProfiles = (staticProfiles?.length ?? 0) > 0;
  const hasProfiles = (profileQueryData?.length ?? 0) > 0;
  const hasAnyProfiles = hasProfiles || hasReferenceProfiles;

  const getPlaceholder = () => {
    if (loading) return 'Loading...';
    return hasAnyProfiles ? 'Select profile' : 'No profiles for selected date range';
  };

  function removeInput(deletedId: NumberOrString) {
    if (!selectionInputs) return; // TODO: Explore on adding proper handling for this case
    dispatchSidePanel({ selectionInputs: selectionInputs.filter((input) => input.id !== deletedId) });
  }

  const setProfileForIndex = useMemo(
    () => (value: string, i: number) => {
      if (value === null) return;
      const newProfiles = [...rawProfiles];
      const tempSelectionInputs = [...selectionInputs];

      newProfiles[i] = value;
      tempSelectionInputs[i] = { id: Number(value) || value, individualProfilesCount: undefined };
      dispatchSidePanel({ selectionInputs: tempSelectionInputs });
      setProfiles(newProfiles);
    },
    [rawProfiles, selectionInputs, dispatchSidePanel, setProfiles],
  );

  function removeTimestampFromArray(i: number) {
    const tempProfiles = [...rawProfiles];
    tempProfiles.splice(i, 1);

    setProfiles(tempProfiles);
  }
  const hasIndividualProfiles = !!individualSelectData?.length;
  const batchProfileData = useMemo(
    () =>
      translateProfilesSelectData(
        profileQueryData ?? [],
        staticProfiles ?? [],
        profiles,
        profiles?.[index]?.toString(),
        selectionInputs,
      ),
    [index, profileQueryData, profiles, selectionInputs, staticProfiles],
  );

  const mountIndividualProfileTooltip = () => {
    const selected = individualProfiles?.[index];
    const foundOption = individualSelectData.find((d) => d.value === selected);
    return foundOption?.label ?? '';
  };

  return (
    <div className={styles.profileSection}>
      <div className={styles.colorIndicator} style={{ backgroundColor }} />
      <div className={styles.profileSectionContent}>
        <div className={styles.profileSectionContainer}>
          {selectionInputs.length > 1 && (
            <WhyLabsButton
              className={cx(styles.removeButton, styles.textButton)}
              variant="subtle"
              onClick={() => {
                removeInput(id);
                removeTimestampFromArray(index);
              }}
            >
              Remove
            </WhyLabsButton>
          )}
          <WhyLabsSelect
            key={`profile-${index + 1}--select`}
            id={`profile-${index + 1}`}
            label={generateSelectLabel(index, hasIndividualProfiles)}
            data={batchProfileData}
            maxDropdownHeight={400}
            onChange={(value) => {
              closeFeaturePanel();
              setProfileForIndex(value ?? '', index);
            }}
            withinPortal
            disabled={!hasAnyProfiles}
            placeholder={getPlaceholder()}
            value={profiles?.[index]?.toString() ?? null}
            styles={{ label: { fontSize: '13px' } }}
          />
          {!!batchProfileData?.length && hasIndividualProfiles && (
            <WhyLabsTooltip label={mountIndividualProfileTooltip()} maxWidth={400}>
              <WhyLabsSelect
                key={`profile-${index}-individual-profiles--select`}
                id={`profile-${index + 1}-2`}
                label={`Profile from the P${index + 1} batch`}
                data={individualSelectData}
                maxDropdownHeight={400}
                withinPortal
                onChange={(value) => {
                  closeFeaturePanel();
                  if (!value) {
                    setProfileForIndex(profiles?.[index]?.toString() ?? '', index);
                    return;
                  }
                  const isMergedProfile = Number(value);
                  const profileString = isMergedProfile
                    ? value
                    : `${profiles?.[index]?.toString()}${INDIVIDUAL_SEPARATOR}${value}`;
                  setProfileForIndex(profileString ?? '', index);
                }}
                value={individualProfiles?.[index] || profiles?.[index]?.toString() || null}
                clearable
                styles={{ label: { fontSize: '13px' } }}
              />
            </WhyLabsTooltip>
          )}
        </div>
      </div>
    </div>
  );
};

function generateSelectLabel(index: number, hasIndividualProfiles: boolean): string {
  if (!hasIndividualProfiles) return `Reference or batch profile for P${index + 1}:`;
  return `Reference profile or batch for P${index + 1}:`;
}
