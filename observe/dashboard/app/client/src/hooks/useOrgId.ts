import LogRocket from 'logrocket';
import { useParams } from 'react-router-dom';

export const useOrgId = (): string => {
  const { orgId } = useParams<{ orgId: string }>();
  if (!orgId) LogRocket.log('useOrgId hook should not be used outside /:orgId route');

  return orgId ?? '';
};
