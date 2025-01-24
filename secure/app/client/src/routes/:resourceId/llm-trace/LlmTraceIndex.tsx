import { Navigate, useLocation } from 'react-router-dom';
import { AppRoutePaths } from '~/types/AppRoutePaths';

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
