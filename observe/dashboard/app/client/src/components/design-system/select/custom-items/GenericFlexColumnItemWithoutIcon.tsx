import { ComponentProps, forwardRef } from 'react';

import { GenericFlexColumnItem } from './GenericFlexColumnItem';

export type GenericFlexColumnItemWithoutIconProps = Omit<ComponentProps<typeof GenericFlexColumnItem>, 'hideIcon'>;

export const GenericFlexColumnItemWithoutIcon = forwardRef<HTMLDivElement, GenericFlexColumnItemWithoutIconProps>(
  (props, ref) => {
    return <GenericFlexColumnItem {...props} hideIcon ref={ref} />;
  },
);
