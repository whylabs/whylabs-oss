import { screen } from '@testing-library/react';
import { useFlags } from '~/hooks/useFlags';

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

// This is a copy of the return value of useFlags() from client/src/hooks/useFlags.ts
// You can use this to mock the proper return type of useFlags() in your tests.
export const FALSE_FLAGS: ReturnType<typeof useFlags> = {
  accountManagement: false,
  customDashboardInResources: false,
  customDashboardsWildcardSegment: false,
  isLoading: false,
  llmSecureOverall: false,
  unfinishedFeatures: false,
  llmTraceResourcesSelect: false,
  llmSecurePolicyHistory: false,
  llmEmbeddingsVisualizer: false,
  settingsPage: false,
  networkedIntegration: false,
  customDashComparisonWidgets: false,
  userPermissionsManagement: false,
  policySmartEditor: false,
  traceDetailViewFilter: false,
  resourceTagging: false,
};
