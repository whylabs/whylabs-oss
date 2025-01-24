import qs from 'query-string';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import useDebouncedEffect from 'use-debounced-effect-hook';

// TODO: Evaluate if this is a good idea, probably not with react-router 6 APIs
export default function useSetupQueryStringListeners(): void {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [queuedParams, setQueuedParams] = useState<string[]>([]);

  const getParamsMap = useCallback(() => {
    const queuedString = queuedParams.join('&');
    const paramsMap = qs.parse(`${search}&${queuedString}`); // Add existing search string with new params

    return paramsMap;
  }, [queuedParams, search]);

  useEffect(() => {
    interface AddQueryPayload {
      key: string;
      value: string;
    }
    function queueChange(e: CustomEvent<AddQueryPayload>) {
      const { key, value } = e.detail;

      setQueuedParams((prev) => [...prev, `${key}=${value}`]);
    }

    window.addEventListener('addQuery', queueChange as EventListener);
    return () => {
      window.removeEventListener('addQuery', queueChange as EventListener);
    };
  }, [search]);

  useDebouncedEffect(
    () => {
      if (queuedParams.length === 0) return;
      const qsMap = getParamsMap();

      navigate({
        search: qs.stringify(qsMap),
      });
      setQueuedParams([]);
    },
    [navigate, queuedParams, getParamsMap],
    100,
  );
}
