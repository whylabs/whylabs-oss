import { FallbackProps } from 'react-error-boundary';

export type ExtendedProps = FallbackProps & {
  showReset?: boolean;
};
