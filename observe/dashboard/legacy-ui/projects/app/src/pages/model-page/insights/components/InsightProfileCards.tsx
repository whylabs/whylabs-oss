import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';
import { InsightType } from 'components/controls/table/profiles-table/insights';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { InsightTag, ListInsightTypeBadges } from './ListInsightTypeBadges';

const BORDER_TRANSITION = 'border-color 100ms ease-in';
const CARD_BOLD_BORDER = 5;
const NORMAL_BORDER_WIDTH = 2;
const CARD_PADDING = {
  top: 20,
  bottom: 14,
  right: 15,
  left: 20,
};
const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
  },
  card: {
    flexBasis: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
  },
  profileIndicator: {
    width: CARD_BOLD_BORDER,
    height: '100%',
    flexShrink: 0,
    background: Colors.brandPrimary700,
  },
  cardInnerBorder: {
    padding: `
      ${CARD_PADDING.top - NORMAL_BORDER_WIDTH}px
      ${CARD_PADDING.right - NORMAL_BORDER_WIDTH}px
      ${CARD_PADDING.bottom - NORMAL_BORDER_WIDTH}px
      ${CARD_PADDING.left - CARD_BOLD_BORDER}px
    `,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    height: '100%',
    transition: BORDER_TRANSITION,
    width: '100%',
    border: `${NORMAL_BORDER_WIDTH}px solid ${Colors.brandSecondary200}`,
    borderLeft: 'unset',
    '&:hover': {
      borderColor: Colors.brandPrimary700,
    },
  },
  cardInnerBorderSelected: {
    borderColor: Colors.brandPrimary700,
    borderWidth: CARD_BOLD_BORDER,
    padding: `
      ${CARD_PADDING.top - CARD_BOLD_BORDER}px
      ${CARD_PADDING.right - CARD_BOLD_BORDER}px
      ${CARD_PADDING.bottom - CARD_BOLD_BORDER}px
      ${CARD_PADDING.left - CARD_BOLD_BORDER}px
    `,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  titleContainer: {
    color: Colors.secondaryLight1000,
    display: 'flex',
    flexDirection: 'column',
  },
  countContainer: {
    alignItems: 'end',
    color: Colors.secondaryLight1000,
    display: 'flex',
    flexDirection: 'column',
  },
  text: {
    color: Colors.secondaryLight1000,
    fontWeight: 400,
    fontSize: 14,
  },
  count: {
    color: Colors.chartPrimary,
    fontSize: 36,
    lineHeight: 'normal',
  },
  title: {
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    fontSize: 14,
  },
  subtitle: {
    color: Colors.secondaryLight1000,
    fontWeight: 400,
    fontSize: 14,
  },
}));

export type InsightCardProfile = {
  alias: string;
  id: string;
  index: number;
  insightsCount: number;
  isSelected: boolean;
  tags: InsightTag[];
};

type InsightProfileCardProps = {
  onSelectProfile: (profileId: string) => void;
  onSelectTag: (tag: InsightType) => void;
  profiles: InsightCardProfile[];
};

export const InsightProfileCards = ({
  onSelectProfile,
  onSelectTag,
  profiles,
}: InsightProfileCardProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { resourceState } = useResourceContext();

  const handleClick = (profileId: string) => () => {
    onSelectProfile(profileId);
  };

  return (
    <div className={classes.root}>
      {profiles.map(({ alias, id, index, insightsCount, isSelected, tags }) => {
        const indexToDisplay = index + 1;

        const style = (() => {
          if (isSelected) return {};

          return { background: colorForIndex(index) };
        })();

        const resourceType = resourceState.resource?.type ?? '';

        return (
          <InvisibleButton
            className={cx(classes.card)}
            onClick={handleClick(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleClick(id)();
              }
            }}
            key={`${alias}-${id}-${index}`}
          >
            <div className={classes.profileIndicator} style={style} />
            <div
              className={cx(classes.cardInnerBorder, {
                [classes.cardInnerBorderSelected]: isSelected,
              })}
            >
              <div className={classes.header}>
                <div className={classes.titleContainer}>
                  <WhyLabsText className={classes.title}>Profile {indexToDisplay}</WhyLabsText>
                  <WhyLabsText>{alias}</WhyLabsText>
                </div>
                <div className={classes.countContainer}>
                  <WhyLabsText className={classes.subtitle}>Insights</WhyLabsText>
                  <WhyLabsText className={classes.count}>{insightsCount}</WhyLabsText>
                </div>
              </div>
              <WhyLabsText className={classes.subtitle}>
                {resourceType} insight for P{indexToDisplay}
              </WhyLabsText>
              <ListInsightTypeBadges onClick={onSelectTag} tags={tags} />
            </div>
          </InvisibleButton>
        );
      })}
    </div>
  );

  function colorForIndex(index: number) {
    return Colors.profilesColorPool[index];
  }
};
