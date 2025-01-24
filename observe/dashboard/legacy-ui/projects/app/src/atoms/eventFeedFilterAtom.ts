import { atom } from 'recoil';

export interface EventFeedFilterState {
  anomaliesOnly: boolean;
  includeFailed: boolean;
  includeUnhelpful: boolean;
}

const DEFAULT_EVENT_FEED_ATOM = {
  anomaliesOnly: true,
  includeFailed: false,
  includeUnhelpful: true,
};

export const EventFeedFilterAtom = atom<EventFeedFilterState>({
  key: 'eventFeedFilterAtom',
  default: DEFAULT_EVENT_FEED_ATOM,
});
