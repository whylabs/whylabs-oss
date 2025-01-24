import { CSSObject, MantineThemeOverride } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

const defaultInputStyle: Record<string, CSSObject> = {
  label: {
    fontWeight: 600,
    fontSize: 14,
    color: Colors.secondaryLight900,
    lineHeight: 1.42,
  },
  root: {
    lineHeight: 1,
  },
};

export const customColors = {
  colors: {
    'sea-foam': [
      Colors.brandSecondary50,
      Colors.brandPrimary100,
      Colors.brandPrimary200,
      Colors.brandPrimary300,
      Colors.brandPrimary400,
      Colors.brandPrimary500,
      Colors.brandPrimary600,
      Colors.brandPrimary700,
      Colors.brandPrimary800,
      Colors.brandPrimary900,
    ],
  },
  primaryShade: 6,
};

// TODO: I'm not sure if this is the best way to do this, but it works.
export const customMantineTheme: MantineThemeOverride = {
  colors: {
    teal: [
      Colors.brandSecondary50,
      Colors.brandPrimary100,
      Colors.brandPrimary200,
      Colors.brandPrimary300,
      Colors.brandPrimary400,
      Colors.brandPrimary500,
      Colors.brandPrimary600,
      Colors.brandPrimary700,
      Colors.brandPrimary800,
      Colors.brandPrimary900,
    ],
  },
  components: {
    Autocomplete: {
      styles: defaultInputStyle,
    },
    Checkbox: {
      styles: defaultInputStyle,
    },
    CheckboxGroup: {
      styles: defaultInputStyle,
    },
    NumberInput: {
      styles: defaultInputStyle,
    },
    PasswordInput: {
      styles: defaultInputStyle,
    },
    Select: {
      styles: defaultInputStyle,
    },
    MultiSelect: {
      styles: defaultInputStyle,
    },
    Textarea: {
      styles: defaultInputStyle,
    },
    TextInput: {
      styles: defaultInputStyle,
    },
    DatePickerInput: {
      styles: defaultInputStyle,
    },
    DateTimePicker: {
      styles: defaultInputStyle,
    },
    InputBase: {
      styles: defaultInputStyle,
    },
  },
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },
  headings: { fontFamily: 'Asap, sans-serif', fontWeight: 400 },
  fontFamily: 'Asap, sans-serif',
};
