import { createStyles, getStylesRef } from '@mantine/core';
import { TextCell } from '@whylabs/observatory-lib';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsButton, WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { AlertTableCell } from './types';

const useStyles = createStyles(() => ({
  tooltipWrapper: {
    alignItems: 'center',
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    width: '100%',
  },
  cellWrapper: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    [`&:not(:hover) .${getStylesRef('filterBtn')}`]: {
      display: 'none',
    },
  },
  filterBtn: {
    ref: getStylesRef('filterBtn'),
    marginLeft: 'auto',
    fontStyle: 'normal',
  },
  span: {
    whiteSpace: 'nowrap',
    width: 'auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: 'Inconsolata',
    fontSize: 13,
    lineHeight: 1.42,
    fontWeight: 400,
  },
}));

interface TextWithActionButtonCellProps extends AlertTableCell {
  text: string;
  unlinkedText?: string;
  width?: number;
  actionHandler?: () => void;
  actionButtonLabel: string;
  actionButtonTooltip?: string;
  hideButton?: boolean;
}

export default function TextWithActionButtonCell({
  text,
  isUnhelpful,
  unlinkedText,
  width,
  actionHandler,
  actionButtonLabel,
  actionButtonTooltip,
  hideButton,
}: TextWithActionButtonCellProps): JSX.Element {
  const { classes } = useStyles();
  const { classes: typography } = useTypographyStyles();
  const cellText = text.concat(unlinkedText ?? '');
  const mainContent = (
    <TextCell disableCaps className={isUnhelpful ? typography.unhelpfulAlertText : undefined}>
      {text.length > 0 ? (
        <div className={classes.cellWrapper} style={{ width }}>
          <WhyLabsText className={classes.span}>
            <WhyLabsTooltip label={cellText}>{cellText}</WhyLabsTooltip>
          </WhyLabsText>
          {!hideButton && actionHandler && (
            <WhyLabsButton
              onClick={actionHandler}
              className={classes.filterBtn}
              variant="outline"
              color="gray"
              size="xs"
              enabledTooltip={actionButtonTooltip}
            >
              {actionButtonLabel}
            </WhyLabsButton>
          )}
        </div>
      ) : (
        <span className={typography.textTable}>N/a</span>
      )}
    </TextCell>
  );

  return <div className={classes.tooltipWrapper}>{mainContent}</div>;
}
