import { WhyLabsTabsProps } from '../WhyLabsTabs';

export function getTestTabs(): WhyLabsTabsProps['tabs'] {
  return [
    {
      children: <div data-testid="NotesTabContent" />,
      label: 'Notes',
    },
    {
      children: <div data-testid="TimelineTabContent" />,
      label: 'Timeline',
    },
    {
      children: <div data-testid="TutorialsTabContent" />,
      label: 'Tutorials',
    },
  ];
}
