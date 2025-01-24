import { AppRoutePaths } from '~/types/AppRoutePaths';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const DeprecatedLlmTraceRoute = () => {
  const location = useLocation();

  const newPathname = location.pathname.replace(AppRoutePaths.deprecatedLlmTrace, AppRoutePaths.resourceIdLlmTrace);

  useEffect(() => {
    // Not sure why, but using react-router navigate doesn't update the URL, even though it navigates to the correct page
    // So we're forcing the URL to update instead
    window.location.href = `${window.location.origin}${newPathname}${location.search}${location.hash}`;
  }, [newPathname, location.hash, location.search]);

  return null;
};
