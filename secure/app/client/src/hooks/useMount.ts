/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

type UseEffectParams = Parameters<typeof useEffect>;
type EffectCallback = UseEffectParams[0];

export const useMount = (callback: EffectCallback): void => {
  useEffect(callback, []);
};
