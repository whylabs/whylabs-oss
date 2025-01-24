import { HtmlTooltip } from '@whylabs/observatory-lib';
import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { tooltips } from 'strings/tooltips';
import { Skeleton } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { friendlyFormat } from 'utils/numberUtils';
import { isNumber } from 'utils/typeGuards';

interface SegmentCountDiscreteProps {
  readonly segmentsCounter: number | undefined;
}

export function SegmentCountDiscreteWidget({ segmentsCounter }: SegmentCountDiscreteProps): JSX.Element | null {
  const { classes: styles, cx } = useModelWidgetStyles();

  return (
    <div className={styles.root}>
      <div className={styles.headlineColumn}>
        <WhyLabsText inherit className={cx(styles.bolded, styles.headline)}>
          Total segments
          <HtmlTooltip tooltipContent={tooltips.segment_total_count} />
        </WhyLabsText>

        {isNumber(segmentsCounter) ? (
          <WhyLabsText inherit className={cx(styles.heroNumber)}>
            {friendlyFormat(segmentsCounter)}
          </WhyLabsText>
        ) : (
          <WhyLabsText>
            <Skeleton variant="text" width={84} height={38} animate />
          </WhyLabsText>
        )}
      </div>
    </div>
  );
}
