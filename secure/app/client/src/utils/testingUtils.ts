import { screen } from '@testing-library/react';
import { NullableString } from '~server/types/generic-types';

export function getSelectedTabContent(): NullableString {
  return screen.getByRole('tab', { selected: true }).textContent;
}
