export const ORG_DASHBOARD_LOCATION_TEXT = 'Org dashboards';

const RESOURCE_META_KEY = 'resource';

// List of meta keys we enabled for custom dashboards
const META_KEYS = [RESOURCE_META_KEY];

const parseUsedOnDashboardString = (usedOn?: string | null) => {
  if (!usedOn) return null;

  const [meta, id] = usedOn.split('|');
  const resourceId = (() => {
    if (meta === RESOURCE_META_KEY) return id ?? null;
    return null;
  })();
  return { meta, resourceId, raw: usedOn };
};

const isKeyValidMeta = (key: string) => META_KEYS.includes(key);

export type UsedOnMetadata = {
  meta: string;
  resourceId: string | null;
  raw: string;
};

export const readUsedOnDashboard = (usedOn?: string | null): UsedOnMetadata | null => {
  if (!usedOn) return null;

  const usedOnData = parseUsedOnDashboardString(usedOn);
  if (!usedOnData) return null;

  const { meta } = usedOnData;
  if (!isKeyValidMeta(meta)) return null;

  // For resource context, we need to have a resourceId
  if (meta === RESOURCE_META_KEY && !usedOnData.resourceId) return null;

  return usedOnData;
};
