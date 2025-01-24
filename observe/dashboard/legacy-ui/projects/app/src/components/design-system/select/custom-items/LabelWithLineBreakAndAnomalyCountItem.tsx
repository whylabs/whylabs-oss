import { createStyles, getStylesRef, SelectItem } from '@mantine/core';
import { Colors, RedAlertBall, stringMax } from '@whylabs/observatory-lib';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import WhyLabsTooltip from '../../tooltip/WhyLabsTooltip';
import WhyLabsText from '../../text/WhyLabsText';
import WhyLabsTextHighlight from '../../text-highlight/WhyLabsTextHighlight';

export interface LabelWithLineBreakAndAnomalyCountData extends React.ComponentPropsWithoutRef<'div'>, SelectItem {
  classNames?: {
    label?: string;
  };
  isActive?: boolean;
  bottomText?: string;
  totalAnomalies?: number;
  tooltip?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  adHocRunId?: string;
  onClick?: () => void;
  value: string;
  label: string;
  filterString?: string;
}

const useLabelWithLineBreakAndAnomalyCountStyles = createStyles(() => ({
  item: {
    alignItems: 'center',
    borderRadius: 4,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 15,
    maxWidth: '100%',
    overflow: 'hidden',
    padding: '6px 10px',
    minHeight: 36,
    textOverflow: 'ellipsis',
  },
  activeItem: {
    background: Colors.chartPrimary,
    color: Colors.white,
  },
  count: {
    gridArea: 'count',
    justifySelf: 'end',
    '*': {
      cursor: 'inherit',
    },
  },
  labelArea: {
    gridArea: 'label',
  },
  labelContainer: {
    maxWidth: 'fit-content',
    whiteSpace: 'pre-wrap',
    fontWeight: 500,
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: Colors.secondaryLight1000,
    textAlign: 'start',
    ref: getStylesRef('label'),
  },
  disabledLabel: {
    color: Colors.grey,
  },
  bottomText: {
    fontWeight: 400,
    fontSize: 12,
    ref: getStylesRef('bottomText'),
  },
  wrapper: {
    padding: 0,
    background: Colors.white,
    '&[data-selected]': {
      background: `${Colors.brandPrimary900} !important`,
      [`.${getStylesRef('label')}, .${getStylesRef('bottomText')}`]: {
        color: 'white',
      },
      [`& .${getStylesRef('loader')}`]: {
        stroke: Colors.white,
      },
    },
  },
}));
const MAX_LABEL_LENGTH = 100;
export const LabelWithLineBreakAndAnomalyCount = ({
  classNames,
  className,
  isActive,
  label,
  bottomText,
  totalAnomalies,
  tooltip,
  disabled,
  disabledTooltip,
  adHocRunId,
  onClick,
  filterString,
  ...others
}: LabelWithLineBreakAndAnomalyCountData): React.ReactElement => {
  const showTooltip = disabled || label.length > MAX_LABEL_LENGTH || tooltip;
  const usedTooltipLabel =
    disabled && disabledTooltip ? disabledTooltip : `${disabled ? '[Disabled] ' : ''}${tooltip || label}`;
  const { classes, cx } = useLabelWithLineBreakAndAnomalyCountStyles();

  const element = (
    <div {...others} id={`item-${others.value}`} className={cx(className, classes.wrapper)}>
      <WhyLabsTooltip label={showTooltip ? usedTooltipLabel : ''} maxWidth={400}>
        <div
          className={cx(classes.item, {
            [classes.activeItem]: isActive,
          })}
        >
          <div className={cx({ [classes.labelArea]: !!totalAnomalies }, classes.labelContainer)}>
            <WhyLabsText className={cx(classes.label, classNames?.label, { [classes.disabledLabel]: disabled })}>
              <WhyLabsTextHighlight highlight={filterString ?? ''}>
                {stringMax(label, MAX_LABEL_LENGTH)}
              </WhyLabsTextHighlight>
            </WhyLabsText>
            {bottomText && bottomText !== label && (
              <WhyLabsText className={classes.bottomText}>{bottomText}</WhyLabsText>
            )}
          </div>
          {!!totalAnomalies && (
            <div className={classes.count}>
              <RedAlertBall adHocRunId={adHocRunId} alerts={totalAnomalies} inverted />
            </div>
          )}
        </div>
      </WhyLabsTooltip>
    </div>
  );

  return (
    <InvisibleButton onClick={onClick} disabled={disabled}>
      {element}
    </InvisibleButton>
  );
};
