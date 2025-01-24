import { handleSetParams } from '../usePageLinkHandler';

describe('Tests for set params navigator function', () => {
  it('testing with one parameter and usedSearchString', () => {
    const result = handleSetParams([{ name: 'metric', value: 'foo' }], '?orgId=test');
    expect(result).toEqual('?orgId=test&metric=foo');
  });
  it('testing with two parameter and usedSearchString', () => {
    const result = handleSetParams(
      [
        { name: 'metric', value: 'foo' },
        { name: 'edit', value: 'true' },
      ],
      '?orgId=test',
    );
    expect(result).toEqual('?orgId=test&metric=foo&edit=true');
  });
  it('testing with one parameter without usedSearchString', () => {
    const result = handleSetParams([{ name: 'metric', value: 'foo' }], '');
    expect(result).toEqual('?metric=foo');
  });
  it('testing with two parameter without usedSearchString', () => {
    const result = handleSetParams(
      [
        { name: 'metric', value: 'foo' },
        { name: 'edit', value: 'true' },
      ],
      '',
    );
    expect(result).toEqual('?metric=foo&edit=true');
  });
});
