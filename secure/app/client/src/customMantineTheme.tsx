import { CSSObject, MantineThemeOverride } from '@mantine/core';
import { Colors } from '~/assets/Colors';

const defaultInputStyle: Record<string, CSSObject> = {
  label: {
    fontWeight: 'bold',
    fontSize: 14,
    color: Colors.brandSecondary900,
  },
};

// TODO: I'm not sure if this is the best way to do this, but it works.
export const customMantineTheme: MantineThemeOverride = {
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
    TextArea: {
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
  },
  headings: {
    fontFamily: 'Asap, sans-serif',
    fontWeight: 400,
    sizes: {
      h1: { fontSize: '1.6rem' },
      h2: { fontSize: '1.4rem' },
      h3: { fontSize: '1.3rem' },
      h4: { fontSize: '1.2rem' },
    },
  },
  fontFamily: 'Asap, sans-serif',
};
