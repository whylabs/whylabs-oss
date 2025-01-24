import { Loader, Menu, MenuProps } from '@mantine/core';
import { Fragment, ReactNode } from 'react';

import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';

export interface WhyLabsContextMenuItem {
  icon?: ReactNode;
  label: string;
  loading?: boolean;
  section?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  onClick?: () => void;
}
type WhyLabsContextMenuProps = Pick<
  MenuProps,
  'opened' | 'children' | 'onChange' | 'onOpen' | 'onClose' | 'id' | 'styles' | 'position' | 'withinPortal'
> & {
  items: WhyLabsContextMenuItem[];
  target?: ReactNode;
  width?: number;
};

const FALLBACK_SECTION = 'Others';

export const WhyLabsContextMenu = ({
  children,
  target,
  items,
  withinPortal = true,
  ...rest
}: WhyLabsContextMenuProps) => {
  const hasSections = items.find(({ section }) => !!section);
  const mapItems = () => {
    const map = new Map<string, WhyLabsContextMenuItem[]>([]);
    items.forEach((item) => {
      const section = item.section ?? FALLBACK_SECTION;
      const sectionItems = map.get(section) ?? [];
      map.set(section, [...sectionItems, item]);
    });
    return map;
  };

  const mapToMenuItem = ({
    label,
    icon,
    section,
    onClick,
    loading,
    disabled,
    disabledTooltip = '',
  }: WhyLabsContextMenuItem) => {
    const usedDisabledTooltip = disabled ? disabledTooltip : '';
    const usedTooltipLabel = loading ? '' : usedDisabledTooltip;
    return (
      <WhyLabsTooltip label={usedTooltipLabel} key={`menu-item-${section ?? FALLBACK_SECTION}-${label}--tooltip`}>
        <Menu.Item
          onClick={onClick}
          id={`pendo-chart-drawn-menu--${label}`}
          key={`menu-item-${section ?? FALLBACK_SECTION}-${label}`}
          icon={loading ? <Loader size={14} /> : icon}
          disabled={loading || disabled}
        >
          {label}
        </Menu.Item>
      </WhyLabsTooltip>
    );
  };

  const renderSectionedItems = () => {
    const mappedItems = mapItems();
    return [...mappedItems.entries()].map(([section, sectionItems], index) => {
      return (
        <Fragment key={`section${section}`}>
          <Menu.Label key={`menu-section${section}`}>{section}</Menu.Label>
          {renderItems(sectionItems)}
          {index < mappedItems.size - 1 && <Menu.Divider />}
        </Fragment>
      );
    });
  };

  const renderItems = (menuItems: WhyLabsContextMenuItem[] = items) => {
    return menuItems.map(mapToMenuItem);
  };

  return (
    <div data-testid="WhyLabsContextMenu">
      <Menu shadow="md" {...rest} withinPortal={withinPortal}>
        {target && <Menu.Target>{target}</Menu.Target>}
        <Menu.Dropdown>{hasSections ? renderSectionedItems() : renderItems()}</Menu.Dropdown>
      </Menu>
    </div>
  );
};
