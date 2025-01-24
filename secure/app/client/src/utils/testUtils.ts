import { screen } from '@testing-library/react';

export function getByTextContent(textMatch: string | RegExp): HTMLElement {
  return screen.getByText(textMatchFn(textMatch));
}

function textMatchFn(textMatch: string | RegExp) {
  return (_: string, node: Element | null) => {
    const hasText = (inNode: Element) => {
      if (typeof textMatch === 'string') {
        return inNode.textContent === textMatch;
      }
      return inNode.textContent?.match(textMatch) !== null;
    };

    const nodeHasText = node ? hasText(node) : false;
    const childrenDontHaveText = Array.from(node?.children ?? []).every((child) => !hasText(child));
    return nodeHasText && childrenDontHaveText;
  };
}
