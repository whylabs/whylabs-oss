export const SETTINGS_NAV_MENU = [
  {
    id: 'callback-settings',
    icon: 'webhook',
    label: 'Callbacks settings',
    clickHandler: () => {
      /* navigate */
    },
  },
  {
    id: 'advanced-settings',
    icon: 'box',
    label: 'Advanced Settings',
    clickHandler: () => {
      /* navigate */
    },
  },
  {
    id: 'change-history',
    icon: 'history',
    label: 'Policy version history',
    clickHandler: () => {
      /* navigate */
    },
  },
] as const;

export const accordionStyles = {
  label: {
    padding: 0,
  },
  control: {
    padding: 0,
    alignItems: 'start',
    '&:hover': {
      background: 'white',
    },
  },
  content: {
    padding: 0,
  },
  item: {
    padding: 15,
  },
  chevron: {
    marginLeft: 10,
  },
};

export const CARD_WIDTH = {
  min: 600,
  max: 900,
};
