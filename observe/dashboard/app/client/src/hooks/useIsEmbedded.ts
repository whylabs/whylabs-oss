import { IS_CUSTOM_EMBEDDED_QUERY_NAME, IS_EMBEDDED_QUERY_NAME } from '~/utils/searchParamsConstants';
import { useSearchParams } from 'react-router-dom';

export const useIsEmbedded = () => {
  const [searchParams] = useSearchParams();
  const isEmbeddedIntoCustomContext = searchParams.get(IS_CUSTOM_EMBEDDED_QUERY_NAME) === 'true';
  const isEmbedded = searchParams.get(IS_EMBEDDED_QUERY_NAME) === 'true';

  return {
    isEmbeddedIntoCustomContext,
    isEmbedded,
  };
};
