import { createStyles } from '@mantine/core';
import { FloatingPosition } from '@mantine/core/lib/Floating';
import { Colors } from '~/assets/Colors';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { ReactNode } from 'react';

import { useCommonCellStyles } from './useCommonCellStyles';

const useStyles = createStyles(() => ({
  textCell: {
    color: Colors.gray900,
    whiteSpace: 'nowrap',
  },
  wrapper: {
    overflow: 'hidden',
    maxHeight: 'inherit',
    whiteSpace: 'pre-wrap',
    textOverflow: 'ellipsis',
  },
}));

export interface TextCellProps {
  readonly children: ReactNode;
  tooltipText?: string;
  className?: string;
  tooltipPosition?: FloatingPosition;
}
const TextCell = ({ children, className = '', tooltipText = '', tooltipPosition }: TextCellProps): JSX.Element => {
  const { classes: commonClasses } = useCommonCellStyles();
  const { classes, cx } = useStyles();

  return (
    <div className={classes.wrapper}>
      <WhyLabsTooltip label={tooltipText} position={tooltipPosition}>
        <span className={cx(commonClasses.common, classes.textCell, className)}>{children}</span>
      </WhyLabsTooltip>
    </div>
  );
};

export default TextCell;
