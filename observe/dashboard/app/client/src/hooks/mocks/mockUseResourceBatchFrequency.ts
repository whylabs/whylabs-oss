import { TimePeriod } from '~server/graphql/generated/graphql';

import * as useResourceBatchFrequencyHook from '../useResourceBatchFrequency';

type Props = ReturnType<typeof useResourceBatchFrequencyHook.useResourceBatchFrequency>;

export function mockUseResourceBatchFrequency(props: Partial<Props> = {}): jest.SpyInstance {
  return jest.spyOn(useResourceBatchFrequencyHook, 'useResourceBatchFrequency').mockReturnValue({
    loading: false,
    batchFrequency: TimePeriod.P1D,
    ...props,
  });
}
