import { useState } from 'react';
import { NullableString } from '~server/types/generic-types';

import { WhyLabsControlledTabs, WhyLabsControlledTabsProps } from './WhyLabsControlledTabs';

export type WhyLabsTabsProps = Omit<WhyLabsControlledTabsProps, 'activeTab' | 'onTabChange'> & {
  defaultSelected?: string;
  onTabChange?: WhyLabsControlledTabsProps['onTabChange'];
};

const WhyLabsTabs = ({ defaultSelected, onTabChange, ...rest }: WhyLabsTabsProps): JSX.Element | null => {
  const [activeTab, setActiveTab] = useState<NullableString>(defaultSelected || (rest.tabs?.[0]?.label ?? null));

  return <WhyLabsControlledTabs activeTab={activeTab} onTabChange={handleOnChange} {...rest} />;

  function handleOnChange(key: string) {
    setActiveTab(key);
    onTabChange?.(key);
  }
};

export default WhyLabsTabs;
