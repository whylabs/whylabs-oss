import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsText } from '~/components/design-system';
import {
  SegmentItemInfo,
  WhyLabsMulticolorSegmentedControl,
} from '~/components/design-system/segmented-control/WhyLabsMulticolorSegmentedControl';

interface SegmentedRowComponentProps {
  description: string;
  segmentItems: SegmentItemInfo[];
  onChange?: (value: string) => void;
  title: string;
  value?: string;
}

const useStyles = createStyles(() => ({
  rowContainer: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '18px',
    color: Colors.secondaryLight1000,
  },
  rowRoot: {
    width: '100%',
    height: '32px',
    display: 'flex',
    alignItems: 'baseline',
  },
  segmentContainer: {
    marginRight: '5px',
  },
}));

export const SegmentedRowComponent = ({
  description,
  segmentItems,
  onChange,
  title,
  value,
}: SegmentedRowComponentProps): React.ReactElement => {
  const { classes } = useStyles();
  return (
    <div className={classes.rowContainer}>
      <WhyLabsText size={14} weight={600}>
        {title}
      </WhyLabsText>
      <div className={classes.rowRoot}>
        <div className={classes.segmentContainer}>
          <WhyLabsMulticolorSegmentedControl segmentItems={segmentItems} onChange={onChange} value={value} />
        </div>
        <WhyLabsText size={14}>{description}</WhyLabsText>
      </div>
    </div>
  );
};
