import { IpAllowListConfiguration } from '@whylabs/songbird-node-client';
import { expect } from 'chai';

import { clientAddrAllowed } from './admin';

const mockWhitelist: IpAllowListConfiguration = {
  organizations: {
    org1: {
      cidr: ['192.0.2.0/24', '192.50.100.0/24'],
    },
    org2: {
      cidr: ['203.0.113.0/24'],
    },
    org4: {
      cidr: ['192.0.2.0/24', '2001:db8::/32', '44.0.2.0/24'],
    },
  },
};
describe('clientAddrAllowed', function () {
  it('should return true if the address is not under whitelist protection', function () {
    expect(clientAddrAllowed('192.50.1.1', 'org3', mockWhitelist)).to.eq(true);
  });

  it('should return true if the address is in range', function () {
    expect(clientAddrAllowed('192.50.100.1', 'org1', mockWhitelist)).to.eq(true);
  });

  it('should return false if the address is not in range', function () {
    expect(clientAddrAllowed('192.168.1.1', 'org1', mockWhitelist)).to.eq(false);
  });

  it('should return true if the IPv6 address is in range, even if there are v4 cidrs first', function () {
    expect(clientAddrAllowed('2001:db8::1', 'org4', mockWhitelist)).to.eq(true);
  });

  it('should return true if the IPv4 address is in range, even if there are v6 cidrs first', function () {
    expect(clientAddrAllowed('44.0.2.26', 'org4', mockWhitelist)).to.eq(true);
  });

  it('should return false if it receives an IPV6 address with IPV4 cidrs', function () {
    expect(clientAddrAllowed('2001:db8::1', 'org1', mockWhitelist)).to.eq(false);
  });
});
