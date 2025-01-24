import { Loader, SelectItem, createStyles, getStylesRef } from '@mantine/core';
import React from 'react';
import { Colors } from '~/assets/Colors';
import WhyLabsTextHighlight from '~/components/design-system/text-highlight/WhyLabsTextHighlight';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { isString } from '~/utils/typeGuards';

import WhyLabsTooltip from '../../tooltip/WhyLabsTooltip';

export interface LabelWithLineBreakData extends React.ComponentPropsWithoutRef<'div'>, SelectItem {
  bottomText?: string;
  disabled?: boolean;
  loading?: boolean;
  disabledTooltip?: string;
  tooltip?: string;
  isActive?: boolean;
  onClick?: () => void;
  classNames?: {
    label?: string;
    root?: string;
  };
  value: string;
  label: string;
  filterString?: string;
}

interface StylesProps {
  hasBottomText: boolean;
  disabled?: boolean;
  loading?: boolean;
}
const useLabelWithLineBreakStyles = createStyles((_, { hasBottomText, disabled, loading }: StylesProps) => ({
  label: {
    maxWidth: 'fit-content',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontWeight: hasBottomText ? 600 : 500,
    fontSize: '14px',
    color: disabled || loading ? Colors.brandSecondary400 : Colors.brandSecondary900,
    ref: getStylesRef('label'),
  },
  bottomText: {
    fontWeight: 400,
    fontSize: '12px',
    textAlign: 'start',
    color: disabled || loading ? Colors.brandSecondary400 : Colors.brandSecondary800,
    ref: getStylesRef('bottomText'),
    whiteSpace: 'pre-line',
  },
  textWrapper: {
    display: 'flex',
    gap: 6,
    fontFamily: 'Asap',
    flexDirection: 'column',
    justifyContent: hasBottomText ? 'space-between' : 'center',
    width: '100%',
    minHeight: '26px',
  },
  activeItem: {
    background: Colors.brandPrimary600,
    [`.${getStylesRef('label')}, .${getStylesRef('bottomText')}`]: {
      color: 'white',
    },
    '&:hover': disabled
      ? {}
      : {
          background: Colors.brandPrimary600,
        },
  },
  wrapper: {
    '&[data-selected="true"]': {
      [`.${getStylesRef('label')}, .${getStylesRef('bottomText')}`]: {
        color: 'white',
      },
    },
  },
}));

export const LabelWithLineBreak = ({
  label,
  disabled,
  disabledTooltip,
  tooltip,
  bottomText,
  isActive,
  onClick,
  classNames,
  className,
  loading,
  filterString,
  ...others
}: LabelWithLineBreakData): JSX.Element => {
  const tooltipLabel =
    disabled && isString(disabledTooltip) ? disabledTooltip : `${disabled ? '[Disabled] ' : ''}${tooltip || label}`;
  const { classes, cx } = useLabelWithLineBreakStyles({ hasBottomText: !!bottomText, disabled });
  const loadingTooltip = loading ? 'Loading...' : '';
  const usedTooltip = loadingTooltip || tooltipLabel;
  const showTooltip = disabled || tooltip || loading;
  const element = (
    <div {...others} className={cx(className, classes.wrapper)} id={`item-${others.value}`}>
      <WhyLabsTooltip label={showTooltip ? usedTooltip : ''}>
        <div
          className={cx(classes.textWrapper, classNames?.root, { [classes.activeItem]: isActive })}
          data-selected={isActive}
        >
          <div className={cx(classes.label, classNames?.label)}>
            {loading && <Loader size={14} />}
            <WhyLabsTextHighlight highlight={filterString ?? ''}>{label}</WhyLabsTextHighlight>
          </div>
          {bottomText && <div className={classes.bottomText}>{bottomText}</div>}
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
