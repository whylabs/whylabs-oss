import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import { useContext } from 'react';
import { useSearchProfiles } from 'hooks/useSearchProfiles';
import { WhyLabsAccordion, WhyLabsButton, WhyLabsText } from 'components/design-system';
import { ProfilesPageContext } from 'pages/model-page/context/ProfilesPageContext';
import { useProfileSidePanelStyles } from '../../ProfileSidePanelCSS';
import { PROFILE_SELECT_LIMIT } from '../utils';
import { ProfileDropDownSelector } from '../ProfileDropDownSelector';

interface ProfilesCollapsibleProps {
  closeFeaturePanel: () => void;
  loading: boolean;
}
export const ProfilesCollapsible: React.FC<ProfilesCollapsibleProps> = ({ closeFeaturePanel, loading }) => {
  const { classes: styles } = useProfileSidePanelStyles();
  const [{ selectionInputs, profileQueryData }, dispatchSidePanel] = useContext(ProfilesPageContext);
  const { profiles } = useSearchProfiles();

  const hasEmptyProfile = profiles.length < selectionInputs.length;
  const totalLoading = loading || !profileQueryData;
  return (
    <WhyLabsAccordion.Item value="profiles">
      <WhyLabsAccordion.Title>
        <WhyLabsText className={styles.textTitle}>
          Profiles
          <HtmlTooltip tooltipContent="A list of all of the dataset profiles that are within the selected time range." />
        </WhyLabsText>
      </WhyLabsAccordion.Title>
      <WhyLabsAccordion.Content>
        <WhyLabsText className={styles.subtitleText}>Select dataset profiles (P1, P2, P3) for comparison</WhyLabsText>

        {selectionInputs.map((input, i) => (
          <ProfileDropDownSelector
            closeFeaturePanel={closeFeaturePanel}
            loading={totalLoading}
            backgroundColor={Colors.profilesColorPool[i]}
            index={i}
            id={input.id}
            key={input.id}
          />
        ))}

        {selectionInputs.length < PROFILE_SELECT_LIMIT && (
          <div className={styles.footer}>
            <WhyLabsButton
              variant="filled"
              color="gray"
              disabled={hasEmptyProfile}
              disabledTooltip="Select the empty profile"
              id="add-profile-button"
              onClick={() => dispatchSidePanel({ selectionInputs: [...selectionInputs, { id: new Date().getTime() }] })}
            >
              Add profile
            </WhyLabsButton>
          </div>
        )}
      </WhyLabsAccordion.Content>
    </WhyLabsAccordion.Item>
  );
};
