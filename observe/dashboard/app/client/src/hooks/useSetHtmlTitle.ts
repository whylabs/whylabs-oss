import { useParams } from 'react-router-dom';

import { useMount } from './useMount';

/*
 * This hook will set the title on mount. You can use the returned function to trigger manual updates if needed
 * @param title first string that will appear on browser tab followed by orgId or modelId and ' | WhyLabs Control Center'
 */
export const useSetHtmlTitle = (title: string): [(t: string) => void] => {
  const { orgId, resourceId } = useParams<{ orgId: string; resourceId?: string }>();
  const currentLevelString = resourceId || orgId;

  const setHtmlTitle = (tabTitle: string) => {
    let finalTitle = tabTitle;
    if (tabTitle) {
      finalTitle = finalTitle.concat(' | ');
    }
    finalTitle = finalTitle.concat(currentLevelString ?? '');
    if (finalTitle) {
      finalTitle = finalTitle.concat(' | ');
    }
    document.title = finalTitle.concat('WhyLabs Control Center');
  };

  useMount(() => {
    setHtmlTitle(title);

    return () => {
      // On un-mount
      // Always returning the default title to prevent display incorrect titles
      setHtmlTitle('');
    };
  });

  return [setHtmlTitle];
};
