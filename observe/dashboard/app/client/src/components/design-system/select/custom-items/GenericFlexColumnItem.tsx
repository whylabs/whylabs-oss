import { Loader, SelectItem, createStyles, getStylesRef } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { isString } from '~/utils/typeGuards';
import { ComponentPropsWithoutRef, ReactElement, ReactNode, forwardRef, useMemo } from 'react';

import WhyLabsTextHighlight from '../../text-highlight/WhyLabsTextHighlight';
import WhyLabsTooltip from '../../tooltip/WhyLabsTooltip';

export interface GenericFlexColumnSelectItemData extends ComponentPropsWithoutRef<'div'>, SelectItem {
  disabled?: boolean;
  hideIcon?: boolean;
  loading?: boolean;
  disabledTooltip?: string;
  tooltip?: string;
  onClick?: () => void;
  classNames?: {
    label?: string;
    root?: string;
  };
  rows?: Array<
    | { element: ReactElement; tooltip?: ReactNode }
    // this object must be used when we want searchString highlight. The Highlight component only accepts string as children
    | { textElementConstructor: (children: ReactElement) => ReactElement; children: string; tooltip?: ReactNode }
  >;
  usedOnFilter?: string[];
  label: string;
  filterString?: string;
}

const useFlexColumnGenericItemStyles = createStyles((_, { disabled }: { disabled?: boolean }) => ({
  itemFlexContainer: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    minHeight: 36,
    padding: '6px 10px',
  },
  textWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  wrapper: {
    padding: 0,
    background: Colors.white,
    '&[data-selected]': {
      background: `${Colors.brandPrimary900} !important`,
      [`& .${getStylesRef('checkedIcon')}`]: {
        display: 'block',
      },
      [`& .${getStylesRef('loader')}`]: {
        stroke: Colors.white,
      },
      '& *': {
        color: 'white',
      },
    },
  },
  rowWrapper: {
    ref: getStylesRef('rowWrapper'),
    '& *': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: disabled ? `${Colors.mantineLightGray} !important` : undefined,
      whiteSpace: 'nowrap',
    },
  },
  checkedIcon: {
    ref: getStylesRef('checkedIcon'),
    display: 'none',
    marginRight: 8,
  },
  loader: {
    ref: getStylesRef('loader'),
    marginRight: 8,
    stroke: Colors.brandPrimary900,
  },
}));

/*
 * This component can be used with any ReactElement, this is to allow us to be non-opinionated about text styles
 * We have an example of usage in WhyLabsSelectPlayground
 */
export const GenericFlexColumnItem = forwardRef<HTMLDivElement, GenericFlexColumnSelectItemData>(
  (
    {
      hideIcon,
      label,
      disabled,
      disabledTooltip,
      tooltip,
      isActive,
      onClick,
      classNames,
      className,
      loading,
      rows,
      usedOnFilter,
      filterString,
      ...others
    },
    ref,
  ) => {
    const tooltipLabel =
      disabled && isString(disabledTooltip) ? disabledTooltip : `${disabled ? '[Disabled] ' : ''}${tooltip || label}`;
    const { classes, cx } = useFlexColumnGenericItemStyles({ disabled });
    const loadingTooltip = loading ? 'Loading...' : '';
    const usedTooltip = loadingTooltip || tooltipLabel;
    const showTooltip = disabled || tooltip || loading;

    const renderIcon = () => {
      if (hideIcon) return null;

      if (loading)
        return (
          <div>
            <Loader className={classes.loader} size={16} />
          </div>
        );

      return (
        <div>
          <IconCheck size={16} className={classes.checkedIcon} />
        </div>
      );
    };

    const renderRowsOrLabel = useMemo(() => {
      if (!rows?.length) return <WhyLabsTextHighlight highlight={filterString ?? ''}>{label}</WhyLabsTextHighlight>;

      return (
        <>
          {rows.map((r, index) => {
            const { tooltip: rowTooltip } = r;
            const usedRowTooltip = !showTooltip && rowTooltip ? rowTooltip : '';
            if ('textElementConstructor' in r) {
              return (
                <WhyLabsTooltip label={usedRowTooltip} key={`${r.children}--tooltip`}>
                  <div className={classes.rowWrapper}>
                    {r.textElementConstructor(
                      <WhyLabsTextHighlight highlight={filterString ?? ''}>{r.children}</WhyLabsTextHighlight>,
                    )}
                  </div>
                </WhyLabsTooltip>
              );
            }
            const { element } = r;
            return (
              <WhyLabsTooltip label={usedRowTooltip} key={element.key ?? `${others.value}-${index}`}>
                <div className={classes.rowWrapper}>{element}</div>
              </WhyLabsTooltip>
            );
          })}
        </>
      );
    }, [classes.rowWrapper, filterString, label, others.value, rows, showTooltip]);

    const element = (
      <div ref={ref} {...others} className={cx(className, classes.wrapper)} id={`item-${others.value}`}>
        <WhyLabsTooltip label={showTooltip ? usedTooltip : ''}>
          <div className={classes.itemFlexContainer}>
            {renderIcon()}
            <div className={cx(classes.textWrapper, classNames?.root)}>{renderRowsOrLabel}</div>
          </div>
        </WhyLabsTooltip>
      </div>
    );

    return (
      <InvisibleButton onClick={onClick} disabled={disabled}>
        {element}
      </InvisibleButton>
    );
  },
);
