import { getLogger } from '../providers/logger';
import { clientAddrAllowed, getIPAllowList } from '../services/data/songbird/api-wrappers/admin';
import { CallOptions } from '../util/async-helpers';

const logger = getLogger('ipAllowList');

export const ipIsAllowed = async (
  clientIp?: string,
  orgId?: string,
  callOptions?: CallOptions,
  debugString = '',
): Promise<boolean> => {
  if (!orgId) {
    // not an org-based request
    return true;
  }
  if (!clientIp) {
    logger.error(`No IP address available for client request for org  ${orgId}`);
    return true;
  }
  const whitelist = await getIPAllowList(callOptions);
  if (clientAddrAllowed(clientIp, orgId, whitelist)) {
    return true;
  }
  // org has whitelist and client IP address does not match any CIDR
  const msg = `IP address ${clientIp} for user ${callOptions?.context?.auth0UserId} not in whitelist for org ${orgId}${debugString}`;
  logger.warn(`${msg} - but ui-ip-allowlist feature flag is disabled so allowing access.`);
  return true;
};
