import { screen } from '@testing-library/react';
import { NullableString } from 'types/genericTypes';

export function getSelectedTabContent(): NullableString {
  return screen.getByRole('tab', { selected: true }).textContent;
}

export function getByTextContent(textMatch: string | RegExp): HTMLElement {
  return screen.getByText(findByContext(textMatch));
}

function findByContext(textMatch: string | RegExp) {
  return (_: string, node: Element | null) => {
    const hasText = (inNode: Element | null): boolean => {
      if (typeof textMatch === 'string') {
        return inNode?.textContent === textMatch;
      }
      return inNode?.textContent?.match(textMatch) !== null;
    };

    const nodeHasText = hasText(node);
    const childrenDontHaveText = Array.from(node?.children || []).every((child) => !hasText(child));
    return nodeHasText && childrenDontHaveText;
  };
}
