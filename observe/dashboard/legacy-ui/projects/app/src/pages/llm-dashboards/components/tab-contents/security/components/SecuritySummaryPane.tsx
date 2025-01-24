import { MetricKind, SegmentTag } from 'generated/graphql';
import { createStyles } from '@mantine/core';
import { Colors, stringMax } from '@whylabs/observatory-lib';
import { WhyLabsBadge, WhyLabsText, WhyLabsTooltip, WhyLabsTypography } from 'components/design-system';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';

interface SecuritySummaryStyleProps {
  color: string;
}

const useStyles = createStyles((_, { color }: SecuritySummaryStyleProps) => ({
  chip: {
    fontFamily: 'Asap, sans-serif',
    fontSize: '13px',
    fontWeight: 600,
    color: Colors.secondaryLight1000,
    textTransform: 'lowercase',
    backgroundColor: color,
    height: '24px',
    paddingLeft: '11px',
    paddingRight: '11px',
    maxWidth: '100%',
  },
  metricName: {
    fontFamily: 'Asap, sans-serif',
    fontSize: '14px',
    lineHeight: 1.4,
    marginTop: '10px',
    fontWeight: 600,
    color: Colors.chartBlue,
  },
  linkBlue: {
    color: Colors.chartBlue,
  },
  textWrapper: {
    fontSize: '12px',
    marginTop: 5,
    position: 'relative',
    fontFamily: 'Asap',
  },
  readMore: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
}));

interface SecuritySummaryPaneProps {
  resourceName: string;
  metricName: string;
  tags: string[];
  description: string;
  metricKind: MetricKind;
  color: string;
  resourceId?: string;
  columnId?: string;
  segmentTags?: SegmentTag[];
}
const DESCRIPTION_MAX_LENGTH = 60;
export const SecuritySummaryPane: React.FC<SecuritySummaryPaneProps> = ({
  resourceName,
  color,
  metricName,
  tags,
  description,
  resourceId,
  columnId,
  segmentTags,
}) => {
  const { classes } = useStyles({ color });
  const usedTags = tags.map((t) => upperCaseFirstLetterOnly(t));
  const { getNavUrl } = useNavLinkHandler();
  const mountTagsLabel = () => {
    if (!usedTags.length) return null;
    if (usedTags.length === 1) {
      return usedTags[0];
    }
    return `${usedTags.length} tags`;
  };
  const renderTagsLabelComponent = () => {
    const label = mountTagsLabel();
    if (usedTags.length > 1)
      return (
        <div style={{ display: 'inline' }}>
          <WhyLabsTooltip maxWidth={300} label={usedTags.join(' | ')}>
            <WhyLabsText size={12} color={Colors.linkColor} underline display="inline">
              {label}
            </WhyLabsText>
          </WhyLabsTooltip>
        </div>
      );
    return label;
  };
  const renderDescription = () => {
    const tagsLabelLength = mountTagsLabel()?.length ?? 0;
    const totalTextSize = tagsLabelLength + description.length + 3;
    if (totalTextSize > DESCRIPTION_MAX_LENGTH) {
      const descriptionLength = DESCRIPTION_MAX_LENGTH - tagsLabelLength;
      return (
        <>
          {stringMax(description, descriptionLength)}
          &nbsp;&nbsp;
          <div className={classes.readMore}>
            <WhyLabsTooltip maxWidth={300} label={description}>
              <WhyLabsText size={12} color={Colors.linkColor} underline display="inline">
                Read more
              </WhyLabsText>
            </WhyLabsTooltip>
          </div>
        </>
      );
    }
    return description;
  };

  const renderName = () => {
    if (!resourceId || !columnId) {
      return <WhyLabsTypography className={classes.metricName}>{metricName}</WhyLabsTypography>;
    }

    return (
      <a
        href={getNavUrl({
          page: 'columns',
          modelId: resourceId,
          segmentTags: { tags: segmentTags ?? [] },
          featureName: columnId,
        })}
        className={classes.linkBlue}
      >
        <WhyLabsTypography className={classes.metricName}>{metricName}</WhyLabsTypography>
      </a>
    );
  };
  return (
    <>
      <WhyLabsBadge radius="lg" className={classes.chip}>
        {resourceName}
      </WhyLabsBadge>
      {renderName()}
      <div className={classes.textWrapper}>
        {renderTagsLabelComponent()} {!!description && '|'} {renderDescription()}
      </div>
    </>
  );
};
