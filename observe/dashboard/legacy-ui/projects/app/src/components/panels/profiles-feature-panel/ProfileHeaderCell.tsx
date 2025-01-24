import { useProfileFeaturePanelStyles } from './ProfilesFeaturePanelCSS';
import { ProfileNameAndColor } from './tableTypes';

export function ProfileHeaderCell({ name, color }: ProfileNameAndColor): JSX.Element {
  const { classes } = useProfileFeaturePanelStyles();
  return (
    <div className={classes.profileHeaderCellStyle}>
      <div
        className={classes.profileHeaderSquareStyle}
        style={{
          backgroundColor: color,
        }}
      />
      <span className={classes.profileHeaderTitleStyle}>{`${name} count`}</span>
    </div>
  );
}
