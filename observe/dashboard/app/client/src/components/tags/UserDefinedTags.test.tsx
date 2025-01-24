import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { NONE_TAGS_GROUP, UserDefinedTags, UserTag, getCustomTagLabel } from './UserDefinedTags';

const { getAllByRole, getByRole, getByText, queryByRole } = screen;

const DEFAULT_TAGS: UserTag[] = [
  { customTag: { color: '#D92B28', backgroundColor: '#FDE7E7', key: 'criticality', value: 'P3' } },
  { customTag: { color: '#BEC43F', backgroundColor: '#F8F9EB', key: 'application', value: 'portfolio-optimization' } },
  {
    customTag: { color: '#27D9D2', backgroundColor: '#E6FDFC', key: NONE_TAGS_GROUP, value: 'portfolio-optimization' },
  },
];

describe('<UserDefinedTags />', () => {
  it('should render tags correctly', () => {
    getRenderer({ tags: DEFAULT_TAGS });
    DEFAULT_TAGS.forEach(({ customTag }) => {
      const label = getCustomTagLabel(customTag);
      expect(getByText(label)).toBeInTheDocument();
    });
  });

  it('should not render anything if no tags are provided', () => {
    const { container } = getRenderer({ tags: [] });
    expect(container.firstChild).toBeNull();
  });

  it('should render a button for each tag when onClick is provided', () => {
    const onClick = jest.fn();
    getRenderer({ tags: DEFAULT_TAGS, onClick });
    expect(getAllByRole('button')).toHaveLength(DEFAULT_TAGS.length);
  });

  it('should not render a button for each tag when onClick is not provided', () => {
    getRenderer({ tags: DEFAULT_TAGS });
    expect(queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call onClick handler when a tag is clicked', async () => {
    const onClick = jest.fn();
    getRenderer({ tags: DEFAULT_TAGS, onClick });
    expect(onClick).not.toHaveBeenCalled();

    await userEvent.click(getByRole('button', { name: getCustomTagLabel(DEFAULT_TAGS[0].customTag) }));
    expect(onClick).toHaveBeenCalledWith(getCustomTagLabel(DEFAULT_TAGS[0].customTag));

    await userEvent.click(getByRole('button', { name: getCustomTagLabel(DEFAULT_TAGS[1].customTag) }));
    expect(onClick).toHaveBeenCalledWith(getCustomTagLabel(DEFAULT_TAGS[1].customTag));
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

// Helpers
type Props = ComponentProps<typeof UserDefinedTags>;
function getRenderer({ tags = [], ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <UserDefinedTags tags={tags} {...rest} />
    </MantineProvider>,
  );
}
