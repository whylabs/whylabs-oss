import { PossibleDateInput, displayRelativeDistanceTo } from '~/utils/dateUtils';
import { useEffect, useState } from 'react';

import { WhyLabsText } from '../design-system';

type LastUpdatedTextProps = {
  className?: string;
  updatedAt: PossibleDateInput;
};

export const LastUpdatedText = ({ className, updatedAt }: LastUpdatedTextProps) => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const distance = displayRelativeDistanceTo(updatedAt, date);

  return <WhyLabsText className={className}>Last updated {distance}</WhyLabsText>;
};
