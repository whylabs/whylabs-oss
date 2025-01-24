import { ButtonProps, createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

export type ButtonWidth = 'full' | 'fit-content';

export type DefaultWhyLabsButtonProps = Pick<
  ButtonProps,
  'children' | 'className' | 'disabled' | 'leftIcon' | 'loading' | 'rightIcon' | 'size' | 'type' | 'style'
> & {
  'aria-label'?: string;
  color?: 'primary' | 'danger' | 'gray' | 'success';
  /**
   * The formId attribute specifies the form the button belongs to.
   * The value of this attribute must be equal to the id attribute of a <form> element in the same document.
   */
  formId?: string;
  id?: string;
  variant: 'filled' | 'outline' | 'subtle';
  // If the component is disabled, whether to display a tooltip explaining why it's disabled
  disabledTooltip?: string;
  // A tooltip to show when the component is enabled
  enabledTooltip?: string;
  width?: ButtonWidth;
};

export const useButtonStyles = createStyles((_, width?: ButtonWidth) => ({
  root: {
    fontWeight: 600,
    lineHeight: '20px',
    padding: '4px 12px',
    width: width === 'full' ? '100%' : 'fit-content',
  },
  dangerOutline: {
    borderColor: Colors.red,
    color: Colors.red,
  },
  danger: {
    borderColor: Colors.red,
    background: Colors.red,
    color: Colors.white,
    '&:hover': {
      background: `${Colors.brandRed4} !important`,
    },
  },
  success: {
    borderColor: Colors.attrColor,
    background: Colors.attrColor,
    color: Colors.black,
    '&:hover': {
      background: Colors.attrColor,
    },
  },
  gray: {
    background: Colors.white,
    borderColor: Colors.secondaryLight700,
    color: Colors.secondaryLight1000,
    '&:hover': {
      background: Colors.secondaryLight100,
      color: Colors.secondaryLight1000,
    },
  },
  grayOutline: {
    background: Colors.transparent,
    borderColor: Colors.secondaryLight700,
    color: Colors.secondaryLight1000,
    '&:hover': {
      background: Colors.secondaryLight100,
      color: Colors.secondaryLight1000,
    },
  },
  withoutBorder: {
    borderColor: 'transparent',
  },
}));
