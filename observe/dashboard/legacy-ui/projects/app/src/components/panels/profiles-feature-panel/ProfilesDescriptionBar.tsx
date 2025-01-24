import { WhyLabsText } from 'components/design-system';
import { useProfileFeaturePanelStyles } from './ProfilesFeaturePanelCSS';
import { ProfileDataGroup } from './tableTypes';

type ProfilesDescriptionBarProps = {
  profiles: ProfileDataGroup[];
};

export function ProfilesDescriptionBar({ profiles }: ProfilesDescriptionBarProps): JSX.Element {
  const { classes } = useProfileFeaturePanelStyles();

  return (
    <div className={classes.profilesBarHeader}>
      <div className={classes.profilesBarHeaderContent}>
        {profiles.map((profile) => {
          return (
            <div key={profile.name} style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div className={classes.profileColorBar} style={{ background: profile.color }} />
              <div className={classes.profileBarHeaderStack}>
                <WhyLabsText inherit className={classes.profileBarHeaderName}>
                  {profile.name}
                </WhyLabsText>
                <WhyLabsText inherit className={classes.profileBarHeaderDescription}>
                  {profile.description}
                </WhyLabsText>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
