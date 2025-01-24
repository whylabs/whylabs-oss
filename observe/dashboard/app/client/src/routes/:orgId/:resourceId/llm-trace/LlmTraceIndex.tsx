import { AppRoutePaths } from '~/types/AppRoutePaths';
import { Navigate, useLocation } from 'react-router-dom';

export const LlmTraceIndex = () => {
  const location = useLocation();

  return (
    <Navigate
      to={{
        pathname: AppRoutePaths.resourceIdLlmTraceSummary,
        search: location.search,
      }}
    />
  );
};
