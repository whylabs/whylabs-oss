import { createContext, useReducer } from 'react';
import { useQueryParams } from 'utils/queryUtils';
import { getParam } from 'pages/page-types/usePageType';
import { LLM_COMPARED_WITH, LLM_PRIMARY_SEGMENT, LLM_SECONDARY_SEGMENT } from 'types/navTags';
import { ParsedSegment, parseSimpleDisplaySegment, simpleStringifySegment } from 'pages/page-types/pageUrlQuery';

export interface TabsState {
  compareWithResourceId: string | null;
  primarySelectedSegment: ParsedSegment | null;
  secondarySelectedSegment: ParsedSegment | null;
  securityTabDrawerOpenOn: 'events-feed' | 'insights' | null;
}

function generateTabsState(): TabsState {
  const primarySegmentString = decodeURIComponent(getParam(LLM_PRIMARY_SEGMENT) ?? '');
  const secondarySegmentString = decodeURIComponent(getParam(LLM_SECONDARY_SEGMENT) ?? '');
  return {
    compareWithResourceId: getParam(LLM_COMPARED_WITH) ?? null,
    primarySelectedSegment: parseSimpleDisplaySegment(primarySegmentString) || { tags: [] },
    secondarySelectedSegment: parseSimpleDisplaySegment(secondarySegmentString) || { tags: [] },
    securityTabDrawerOpenOn: null,
  };
}

const DashboardTabsContext = createContext<[TabsState, React.Dispatch<Partial<TabsState>>]>([
  generateTabsState(),
  () => {
    /**/
  },
]);

function tabsReducer(state: TabsState, updates: Partial<TabsState>): TabsState {
  let finalUpdates = { ...updates };
  if ('compareWithResourceId' in updates && updates.compareWithResourceId !== state.compareWithResourceId) {
    // cleaning secondary data when compared model changes
    finalUpdates = { ...finalUpdates, secondarySelectedSegment: { tags: [] } };
  }
  return { ...state, ...finalUpdates };
}

const updateParamIfNeeded = (
  key: string,
  state: string | null,
  setQueryParam: (key: string, value?: string | null | undefined) => void,
) => {
  if ((state || null) !== (getParam(key) || null)) {
    setQueryParam(key, state);
  }
};

const useUrlParamsUpdater = ({
  compareWithResourceId,
  primarySelectedSegment,
  secondarySelectedSegment,
}: TabsState) => {
  const { setQueryParam } = useQueryParams();
  const primarySegmentString = simpleStringifySegment(primarySelectedSegment);
  const secondarySegmentString = simpleStringifySegment(secondarySelectedSegment);
  updateParamIfNeeded(LLM_COMPARED_WITH, compareWithResourceId, setQueryParam);
  updateParamIfNeeded(LLM_PRIMARY_SEGMENT, encodeURIComponent(primarySegmentString), setQueryParam);
  updateParamIfNeeded(LLM_SECONDARY_SEGMENT, encodeURIComponent(secondarySegmentString), setQueryParam);
};

const DashboardTabsContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const [tabsState, tabsDispatch] = useReducer(tabsReducer, generateTabsState());
  useUrlParamsUpdater(tabsState);

  const { children } = props;
  return <DashboardTabsContext.Provider value={[tabsState, tabsDispatch]}>{children}</DashboardTabsContext.Provider>;
};

export { DashboardTabsContext, DashboardTabsContextProvider };
