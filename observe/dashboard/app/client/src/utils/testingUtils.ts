import { screen } from '@testing-library/react';
import { NullableString } from '~/types/genericTypes';

export function getSelectedTabContent(): NullableString {
  return screen.getByRole('tab', { selected: true }).textContent;
}
