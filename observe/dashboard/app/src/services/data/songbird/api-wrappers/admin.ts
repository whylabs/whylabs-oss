import { IpAllowListConfiguration } from '@whylabs/songbird-node-client';
import ipaddr from 'ipaddr.js';

import { getLogger } from '../../../../providers/logger';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { songbirdClient } from '../songbird-client-factory';

const MAX_CACHE_AGE_MS = 30 * 1000; // 30 seconds

let cachedIpAllowList: IpAllowListConfiguration | null = null;
let lastCachedTime = 0;

const logger = getLogger('songbirdAdmin');

const isIPv4 = (addr: ipaddr.IPv4 | ipaddr.IPv6): addr is ipaddr.IPv4 => addr.kind() === 'ipv4';

export const addressInRange = (addr: string, cidr: string): boolean => {
  const clientAddress = ipaddr.parse(addr);
  const parsedCidr = ipaddr.parseCIDR(cidr);
  const cidrKind = parsedCidr[0].kind();
  if (isIPv4(clientAddress)) {
    return cidrKind == 'ipv4' && clientAddress.match(ipaddr.IPv4.parseCIDR(cidr));
  } else {
    return cidrKind == 'ipv6' && clientAddress.match(ipaddr.IPv6.parseCIDR(cidr));
  }
};

export const clientAddrAllowed = (addr: string, orgId: string, whitelist: IpAllowListConfiguration | null): boolean => {
  const cidrs = whitelist?.organizations[orgId]?.cidr;
  if (!cidrs) {
    // not under whitelist protection
    return true;
  }

  try {
    const match = cidrs.find((cidr) => addressInRange(addr, cidr));
    if (match) {
      logger.info(`Matched IP address ${addr} to cidr ${match} for org ${orgId}`);
    }
    return !!match;
  } catch (err) {
    logger.error(err, `Error parsing IP address ${addr} or cidrs ${cidrs} for org ${orgId}`);
    return false;
  }
};

/**
 * Get the IP allow list configuration for an org
 * @param options Call options
 */
export const getIPAllowList = async (options?: CallOptions): Promise<IpAllowListConfiguration | null> => {
  if (!cachedIpAllowList || Date.now() > lastCachedTime + MAX_CACHE_AGE_MS) {
    const client = options?.context?.songbirdClient ?? songbirdClient;
    const response = await tryCall(() => client.admin.getIpAllowListConfiguration(axiosCallConfig(options)), options);
    lastCachedTime = Date.now();
    cachedIpAllowList = response.data;
  }

  return cachedIpAllowList;
};
