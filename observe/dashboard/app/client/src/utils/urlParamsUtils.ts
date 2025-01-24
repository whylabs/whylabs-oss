import { encodeObject } from '~/utils/uriUtils';

export function setEncodedObjectForSearchParamKey<T extends Record<string, unknown>>(
  paramKey: string,
  obj: T,
  nextSearchParam: URLSearchParams,
) {
  nextSearchParam.append(paramKey, encodeObject(obj));
  return nextSearchParam;
}
