import { Fragment, useCallback, useState } from 'react';
import { Skeleton } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsBadge, WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { arrayOfLength } from 'utils/arrayUtils';
import { InsightProfileCards } from './components/InsightProfileCards';
import { InsightTypeBadge } from './components/InsightTypeBadge';
import { useResourceInsightsPageStyles } from './useResourceInsightsPageStyles';
import { useResourceInsightsPageViewModel } from './useResourceInsightsPageViewModel';
import { ListInsightTypeBadges } from './components/ListInsightTypeBadges';

type ProfileReportProps = {
  onHideReport: (featureHighlight?: string) => void;
};

export const ResourceInsightsPage = ({ onHideReport }: ProfileReportProps): JSX.Element => {
  const { classes, cx } = useResourceInsightsPageStyles();
  const [scrollTop, setScrollTop] = useState(0);

  const { error, filterByTags, filteredProfiles, loading, onSelectProfile, onSelectTag, profilesForCards } =
    useResourceInsightsPageViewModel();

  const onFeatureClick = useCallback((featureName: string) => onHideReport(featureName), [onHideReport]);

  if (loading || !profilesForCards || error) {
    return (
      <div className={classes.root} style={{ paddingTop: 20 }}>
        <div className={classes.scrollContainer}>
          {arrayOfLength(20).map((i) => (
            <div className={classes.row} key={i}>
              <Skeleton height={100} animate />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasFilterByTags = !!filterByTags.length;

  return (
    <div className={classes.root}>
      <div
        className={cx(classes.cardsContainer, {
          [classes.shadow]: !!scrollTop,
        })}
      >
        <InsightProfileCards onSelectProfile={onSelectProfile} onSelectTag={onSelectTag} profiles={profilesForCards} />
        {!!hasFilterByTags && (
          <div className={classes.filterByContainer}>
            Filter by: <ListInsightTypeBadges onClose={onSelectTag} tags={filterByTags} />
          </div>
        )}
      </div>
      <div
        className={classes.scrollContainer}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          if (target.scrollTop > 5 && scrollTop === 0) {
            setScrollTop(target.scrollTop);
          }
          if (target.scrollTop < 5 && scrollTop > 0) {
            setScrollTop(0);
          }
        }}
      >
        {filteredProfiles.map((p) => {
          if (!p.tags.length) return null;

          // Filter it by tags
          if (hasFilterByTags && !filterByTags.find(({ type }) => p.tags.find((t) => t.type === type))) return null;

          const indexToDisplay = p.index + 1;
          const color = colorForIndex(p.index);

          return (
            <div className={classes.card} key={p.id}>
              <div className={classes.cardHeader}>
                <div className={classes.titleContainer}>
                  <div className={classes.titleLeftFloatingColor} style={{ backgroundColor: color }} />
                  <WhyLabsText className={classes.title}>Profile {indexToDisplay} Insights</WhyLabsText>
                  <WhyLabsText>{p.alias}</WhyLabsText>
                </div>
                {!hasFilterByTags && (
                  <WhyLabsBadge customBackground={color} customColor={Colors.white} radius="xl">
                    <span className={classes.badgeText}>
                      {p.insightsCount} insights for P{indexToDisplay}
                    </span>
                  </WhyLabsBadge>
                )}
              </div>
              {p.tags.map((t) => {
                // Filter it by tags
                if (hasFilterByTags && !filterByTags.find((i) => i.type === t.type)) return null;

                return (
                  <Fragment key={t.type}>
                    <div className={classes.divider} />
                    <div className={classes.row}>
                      <div className={classes.column}>
                        {t.list.map(({ featureName, insight }) => (
                          <WhyLabsText inherit className={classes.featureName} key={`${featureName}-${insight.type}`}>
                            <InvisibleButton onClick={() => onFeatureClick(featureName)}>
                              <WhyLabsTooltip label="Click to view">
                                <span className={classes.featureNameButton}>{featureName}</span>
                              </WhyLabsTooltip>
                            </InvisibleButton>{' '}
                            {insight.description}
                          </WhyLabsText>
                        ))}
                      </div>
                      <InsightTypeBadge onClick={() => onSelectTag(t.type)} tag={{ count: t.count, type: t.type }} />
                    </div>
                  </Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  function colorForIndex(index: number) {
    return Colors.profilesColorPool[index];
  }
};
