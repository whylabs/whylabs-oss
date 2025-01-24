import { IS_DEV_ENV } from './constants';

export const forceRedirectToOrigin = () => {
  // While dependent on ui-exp project we can't use the router to redirect to home
  // so we need to do a full page reload to the origin path to load the old stack home page

  window.location.href = window.location.origin;
};

export const getOldStackOriginUrl = () => {
  if (IS_DEV_ENV) return 'http://localhost:3000';

  return window.location.origin;
};

interface getOldStackResourcePageUrlProps {
  resourceId: string;
  orgId: string;
  additionalPath?: string;
}

export const getOldStackResourcePageUrl = ({ resourceId, orgId, additionalPath }: getOldStackResourcePageUrlProps) => {
  let baseUrl = `${getOldStackOriginUrl()}/resources/${resourceId}`;
  if (!additionalPath) {
    return `${baseUrl}?targetOrgId=${orgId}`;
  }

  const newPath = additionalPath?.startsWith('/') ? additionalPath : `/${additionalPath}`;
  baseUrl = baseUrl.concat(newPath);
  const [url, searchString] = baseUrl.split('?');
  const searchQuery = new URLSearchParams(searchString);
  searchQuery.set('targetOrgId', orgId);

  return `${url}?${searchQuery.toString()}`;
};
