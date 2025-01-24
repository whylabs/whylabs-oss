import { config } from '../../config';
import { MaintenanceBanner } from '../../graphql/generated/graphql';
import { getLogger } from '../../providers/logger';
import { fnThrow } from '../../util/misc';
import { Maybe } from './data-service/data-service-types';
import { deleteObject, getObject, writeObject } from './s3-connector';

const logger = getLogger('MaintenanceBanner');

const { metadataBucket } = config.storage;
const maintenanceBannerKey = `health/maintenance-banner.json`;

export const updateMaintenanceBanner = async (message: string, email: string): Promise<void> => {
  if (!metadataBucket) return;
  logger.warn('Updating maintenance banner with message %s', message);

  const meta: Partial<MaintenanceBanner> = { message, updatedBy: email };

  await writeObject(metadataBucket, maintenanceBannerKey, JSON.stringify(meta));
};

const isMaintenanceBanner = (it: Maybe<Record<string, unknown>>): it is MaintenanceBanner => {
  const fields: (keyof MaintenanceBanner)[] = ['message', 'updatedBy'];

  return !!it && fields.every((f) => it[f] !== undefined);
};

export const getMaintenanceBanner = async (): Promise<MaintenanceBanner | null> => {
  if (!metadataBucket) return null;
  logger.debug('Fetching maintenance banner');
  const { data, lastModified } = await getObject(metadataBucket, maintenanceBannerKey, { ignoreMissingObject: true });

  if (!data) {
    logger.debug('No maintenance banner metadata');
    return null;
  }

  logger.debug('Fetched maintenance banner');

  const bannerMeta = JSON.parse(data.toString());
  if (!isMaintenanceBanner(bannerMeta)) {
    logger.error(
      "Couldn't read maintenance banner for key %s in bucket %s: %s",
      maintenanceBannerKey,
      metadataBucket,
      bannerMeta,
    );
    return null;
  }

  return { ...bannerMeta, updatedAt: lastModified ?? fnThrow('Invalid or missing lastModified timestamp') };
};

export const clearMaintenanceBanner = async (): Promise<void> => {
  if (!metadataBucket) return;
  logger.warn('Clearing maintenance banner');

  await deleteObject(metadataBucket, maintenanceBannerKey);

  logger.warn('Cleared maintenance banner');
};
