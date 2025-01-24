import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import useTypographyStyles from 'styles/Typography';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

import { ProfilesRangeLink } from 'components/profiles-range-link/ProfilesRangeLink';
import { WhyLabsText } from 'components/design-system';
import { AssetCategory, TimePeriod } from '../../../../generated/graphql';

const useStyles = createStyles({
  stuffContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'none',
    maxHeight: 40,
  },
  noAlertText: {
    width: '100%',
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
  },
});
export interface ProfilesRangeProps extends CellProps {
  range: [number, number] | null;
  modelId: string;
  batchFrequency: TimePeriod | null;
  assetCategory: AssetCategory | null;
}

const ProfilesRangeCell: React.FC<ProfilesRangeProps> = ({
  range,
  width,
  height,
  modelId,
  batchFrequency,
  assetCategory,
}) => {
  const { classes: commonStyles } = useCommonStyles();
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();

  return (
    <Cell width={width} height={height}>
      <div className={cx(commonStyles.cellNestedPadding, styles.stuffContainer, typography.allContentMonospaceFont)}>
        {range ? (
          <ProfilesRangeLink
            modelId={modelId}
            range={range}
            batchFrequency={batchFrequency}
            assetCategory={assetCategory}
            style={{ fontFamily: 'Inconsolata', color: Colors.linkColor }}
          />
        ) : (
          <WhyLabsText inherit className={cx(typography.noDataText, styles.noAlertText)}>
            No profiles found
          </WhyLabsText>
        )}
      </div>
    </Cell>
  );
};
export default ProfilesRangeCell;
