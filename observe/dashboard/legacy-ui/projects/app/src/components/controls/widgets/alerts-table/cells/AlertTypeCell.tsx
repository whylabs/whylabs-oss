import { TextCell } from '@whylabs/observatory-lib';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsTooltip } from 'components/design-system';
import { AlertTableCell } from './types';

interface AlertTypeCellProps extends AlertTableCell {
  type?: string;
  style?: React.CSSProperties;
  tooltip?: string;
  width?: number;
}

export default function AlertTypeCell({ type, tooltip, isUnhelpful, style, width }: AlertTypeCellProps): JSX.Element {
  const { classes: typography } = useTypographyStyles();
  return (
    <TextCell
      textWidth={width}
      className={isUnhelpful ? typography.unhelpfulAlertText : undefined}
      style={style}
      disableCaps
    >
      <WhyLabsTooltip label={tooltip ?? ''} maxWidth={(width ?? 0) > 200 ? width : undefined} position="bottom-start">
        {type}
      </WhyLabsTooltip>
    </TextCell>
  );
}
