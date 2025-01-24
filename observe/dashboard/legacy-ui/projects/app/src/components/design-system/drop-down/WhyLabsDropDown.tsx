import { createStyles, Popover, PopoverProps } from '@mantine/core';
import React from 'react';

export type WhyLabsDropDownProps = Pick<
  PopoverProps,
  'children' | 'width' | 'opened' | 'position' | 'onClose' | 'withinPortal' | 'closeOnEscape'
> & {
  target: JSX.Element;
  closeModal?: React.Dispatch<React.SetStateAction<boolean>>;
};

const useStyles = createStyles(() => ({
  shadow: {
    webkitBoxShadow: '0px 2px 6px 0px rgba(0,0,0,0.15)',
    MozBoxShadow: '0px 2px 6px 0px rgba(0,0,0,0.15)',
    boxShadow: '0px 2px 6px 0px rgba(0,0,0,0.15)',
  },
}));

const WhyLabsDropDown = ({ children, closeModal, target, ...rest }: WhyLabsDropDownProps): JSX.Element => {
  const { classes } = useStyles();
  return (
    <Popover onChange={closeModal} {...rest} zIndex={999} data-testid="WhyLabsDropDown">
      <Popover.Target>{target}</Popover.Target>
      <Popover.Dropdown p={0} className={classes.shadow}>
        {children}
      </Popover.Dropdown>
    </Popover>
  );
};

export default WhyLabsDropDown;
