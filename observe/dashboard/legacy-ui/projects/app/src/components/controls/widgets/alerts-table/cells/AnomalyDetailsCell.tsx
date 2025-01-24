import useTypographyStyles from 'styles/Typography';
import { WhyLabsTooltip, WhyLabsTypography } from 'components/design-system';
import { Drawer, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import ReactJson from 'react-json-view';
import { AnalysisDataFragment } from 'generated/graphql';
import { TextCell } from '@whylabs/observatory-lib';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { handleKeyPress } from 'utils/event-utils';
import { InvisibleButton } from 'components/buttons/InvisibleButton';

interface AnomalyDetailsCellProps {
  text: string;
  details: AnalysisDataFragment;
  highlightAnomaly?: boolean;
  width?: number;
}

export default function AnomalyDetailsCell({
  text,
  details,
  highlightAnomaly = false,
  width,
}: AnomalyDetailsCellProps): JSX.Element {
  const [opened, { close, open }] = useDisclosure(false);
  const { classes: typography, cx } = useTypographyStyles();
  const { classes: commonStyles } = useCommonStyles();
  const isAnomaly = details.isAnomaly && !details.isFalseAlarm;
  const anomalyId = details.id ?? '<missing-id>';
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      <Drawer
        withinPortal
        opened={opened}
        onClose={close}
        size="600px"
        padding="lg"
        position="right"
        title={<WhyLabsTypography order={5}>{`Anomaly Details: ${anomalyId}`}</WhyLabsTypography>}
      >
        <ScrollArea h={window.innerHeight - 100} type="always">
          <ReactJson displayDataTypes={false} displayObjectSize={false} src={details} />
        </ScrollArea>
      </Drawer>

      <InvisibleButton
        onClick={open}
        onKeyDown={handleKeyPress(open)}
        className={cx(
          typography.textTable,
          commonStyles.clickity,
          commonStyles.dashedCta,
          isAnomaly && commonStyles.redUnderline,
          details.isFalseAlarm && commonStyles.lightGray,
          commonStyles.buttonStyleCleaner,
          commonStyles.textOverflow,
        )}
      >
        <TextCell
          disableCaps
          typographyClassName={highlightAnomaly && isAnomaly ? typography.textTableAlert : ''}
          textWidth={width}
        >
          <WhyLabsTooltip
            label={`${text}. Click to view more details.`}
            maxWidth={Math.max(width ?? 0, 250)}
            position="bottom-start"
          >
            {text}
          </WhyLabsTooltip>
        </TextCell>
      </InvisibleButton>
    </div>
  );
}
