import { ProfilesRangeLink } from 'components/profiles-range-link/ProfilesRangeLink';
import { WhyLabsText } from 'components/design-system';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';
import { AssetCategory, TimePeriod } from '../../../../generated/graphql';

export interface ProfilesCardRangeProps {
  range: [number, number] | null;
  modelId: string;
  batchFrequency: TimePeriod | null;
  assetCategory: AssetCategory | null;
}

const ProfilesRangeCard: React.FC<ProfilesCardRangeProps> = ({ modelId, range, batchFrequency, assetCategory }) => {
  const { classes } = useCardLayoutStyles();
  return (
    <>
      <div className={classes.cardSpacer} />
      <WhyLabsText className={classes.cardSubTitle}>Batch profile lineage</WhyLabsText>
      <ProfilesRangeLink
        modelId={modelId}
        range={range}
        batchFrequency={batchFrequency}
        assetCategory={assetCategory}
      />
    </>
  );
};

export default ProfilesRangeCard;
