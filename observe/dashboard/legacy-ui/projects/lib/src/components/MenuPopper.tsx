import { ClickAwayListener, createStyles, Divider, ListItem, makeStyles, Typography } from '@material-ui/core';
import List from '@material-ui/core/List';
import Popper, { PopperPlacementType, PopperProps } from '@material-ui/core/Popper';
import React from 'react';
import { Colors } from '../constants/colors';

const usePopperStyle = makeStyles(() =>
  createStyles({
    popper: {
      zIndex: 10000,
    },
    selectedItem: {
      color: Colors.brandPrimary900,
      fontWeight: 600,
    },
    popperContainer: {
      display: 'flex',
      marginTop: '4px',
      paddingTop: 6,
      paddingBottom: 6,
      flexDirection: 'column',
      backgroundColor: Colors.white,
      color: Colors.brandSecondary900,
      border: '1px solid rgba(0, 0, 0, 0.25)',
      boxShadow: '0 10px 15px rgb(0, 0, 0, 0.15)',
      borderRadius: `4px`,
    },
    divider: {
      marginBottom: '4px',
      marginTop: '4px',
    },
    item: {
      fontSize: 14,
      color: Colors.secondaryLight1000,
    },
    check: {
      color: Colors.brandPrimary900,
      marginLeft: 'auto',
    },
    itemContainer: {
      display: 'flex',
      padding: '8px 15px 7px',
      cursor: 'pointer',

      '&:hover': {
        backgroundColor: Colors.brandSecondary100,
      },
    },
  }),
);

type PopperListOption<T> = { value: T; title: string };
type PopperListOptions<T> = PopperListOption<T>[];

export type MenuPopperWidgetProps<T> = {
  readonly title?: string | React.ReactElement | null;
  readonly options: PopperListOptions<T>;
  readonly isOpen: boolean;
  readonly placement?: PopperPlacementType | undefined;
  onClose(): void;
  onSelect(option: PopperListOption<T>): void;
} & Pick<PopperProps, 'anchorEl'>;

export function MenuPopper<T>(props: MenuPopperWidgetProps<T>): JSX.Element {
  const styles = usePopperStyle();
  const { anchorEl, title, options, onSelect, onClose, isOpen, placement = 'left' } = props;

  // Note: we can't use a portal until https://github.com/mui-org/material-ui/issues/23215 is fixed b/c of react 17 propogation
  return (
    <Popper className={styles.popper} open={isOpen} anchorEl={anchorEl} disablePortal placement={placement}>
      <ClickAwayListener onClickAway={onClose}>
        <div className={styles.popperContainer}>
          {title && <Typography>{title}</Typography>}
          {title && <Divider className={styles.divider} />}
          <List dense disablePadding>
            {options.map((option) => (
              <ListItem
                className={styles.itemContainer}
                key={option.title}
                onClick={() => onSelect(option)}
                disableGutters
                dense
              >
                <Typography className={styles.item}>{option.title}</Typography>
              </ListItem>
            ))}
          </List>
        </div>
      </ClickAwayListener>
    </Popper>
  );
}
