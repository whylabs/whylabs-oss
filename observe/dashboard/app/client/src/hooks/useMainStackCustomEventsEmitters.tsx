import { useCallback } from 'react';

type StackEventBusReturn = {
  dashboardDeletion: (dashboardId: string) => void;
  dashboardNameChange: (dashboardId: string, updatedName: string) => void;
  navigate: (params: DispatchParams) => void;
  setSearchParams: (searchParams: string) => void;
  urlReplace: (newUrl: string) => void;
  loadingComplete: (params: { url: string; page: string }) => void;
  emitReferenceThreshold: (params: { url: string; page: string; value: number }) => void;
};

export enum MainStackEvents {
  SetSearchParams = 'set_search_params',
  StackNavigation = 'navigation',
  URLReplace = 'url_replace',
  LoadingComplete = 'loading_complete',
  RefThresholdChange = 'ref_threshold_change',
  DashboardDeletion = 'dashboard_deletion',
  DashboardNameChange = 'dashboard_name_change',
} // Should be in sync in ui-exp

interface DispatchParams {
  modelId: string;
  page: string;
  data: unknown;
}
export const useMainStackCustomEventsEmitters = (): StackEventBusReturn => {
  const dashboardDeletion = useCallback((dashboardId: string) => {
    const event = new CustomEvent(MainStackEvents.DashboardDeletion, { detail: dashboardId });
    window.parent.document.dispatchEvent(event);
  }, []);

  const dashboardNameChange = useCallback((dashboardId: string, updatedName: string) => {
    const event = new CustomEvent(MainStackEvents.DashboardNameChange, { detail: { id: dashboardId, updatedName } });
    window.parent.document.dispatchEvent(event);
  }, []);

  const navigate = useCallback((params: DispatchParams) => {
    const event = new CustomEvent(MainStackEvents.StackNavigation, { detail: params });
    window.parent.document.dispatchEvent(event);
  }, []);

  const urlReplace = useCallback((newUrl: string) => {
    const event = new CustomEvent(MainStackEvents.URLReplace, { detail: newUrl });
    window.parent.document.dispatchEvent(event);
  }, []);

  const setSearchParams = useCallback((searchParams: string) => {
    const event = new CustomEvent(MainStackEvents.SetSearchParams, { detail: searchParams });
    window.parent.document.dispatchEvent(event);
  }, []);

  const loadingComplete = useCallback((params: { url: string; page: string }) => {
    const event = new CustomEvent(MainStackEvents.LoadingComplete, { detail: params });
    window.parent.document.dispatchEvent(event);
  }, []);

  const emitReferenceThreshold = useCallback((params: { url: string; page: string; value: number }) => {
    const event = new CustomEvent(MainStackEvents.RefThresholdChange, { detail: params });
    window.parent.document.dispatchEvent(event);
  }, []);

  return {
    dashboardDeletion,
    dashboardNameChange,
    navigate,
    setSearchParams,
    urlReplace,
    loadingComplete,
    emitReferenceThreshold,
  };
};
