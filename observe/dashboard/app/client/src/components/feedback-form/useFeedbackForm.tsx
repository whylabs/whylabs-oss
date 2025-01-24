import { FEEDBACK_QUERY_NAME } from '~/utils/searchParamsConstants';
import LogRocket from 'logrocket';
import { useSearchParams } from 'react-router-dom';

import { FeedbackInfo, feedbackSchema } from './feedbackFormTypes';

export const useFeedbackForm = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const openFeedbackModal = (info: FeedbackInfo) => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.set(FEEDBACK_QUERY_NAME, JSON.stringify(info));
      return nextSearchParams;
    });
  };

  const feedbackInfo: FeedbackInfo | null = (() => {
    const paramsAsString = searchParams.get(FEEDBACK_QUERY_NAME) ?? '';
    if (!paramsAsString) return null;

    try {
      const result = feedbackSchema.safeParse(JSON.parse(paramsAsString));
      if (result.success) return result.data;
    } catch (error) {
      LogRocket.error(`Error fetching feedback props from URL search params: ${error}`);
    }
    return null;
  })();

  const isOpen = !!feedbackInfo;

  const onClose = () => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.delete(FEEDBACK_QUERY_NAME);
      return nextSearchParams;
    });
  };

  return {
    feedbackInfo,
    isOpen,
    onClose,
    openFeedbackModal,
  };
};
