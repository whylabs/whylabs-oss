import * as usePagingInfoHook from '../usePagingInfo';

export function mockUsePagingInfo(props: Partial<usePagingInfoHook.UsePagingInfoReturnType> = {}): jest.SpyInstance {
  return jest.spyOn(usePagingInfoHook, 'usePagingInfo').mockReturnValue({
    pagingInfo: {
      limit: 10,
      offset: 0,
      ...props.pagingInfo,
    },
    page: 0,
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    ...props,
  });
}
