import { createStyles } from '@mantine/core';
import { CustomTag } from 'generated/graphql';
import { useState } from 'react';
import { Tag } from './Tag';
import { MoreTag } from './MoreTag';
import WhyLabsModal from '../modal/WhyLabsModal';
import { getCustomTagLabel } from '../../tags/UserDefinedTags';

const useStyles = createStyles((_, rowMaxWidth: number | undefined) => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
    maxWidth: rowMaxWidth,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    alignItems: 'start',
  },
}));

type TagListProps = {
  tags?: CustomTag[];
  resourceId: string;
  maxWidth?: number;
  noTagsElement?: JSX.Element;
  addResourceTagToFilter?: (t: string[]) => void;
};

const DEFAULT_ROW_WIDTH = 300;
const MODAL_WIDTH = 400;
const APPROXIMATE_DIVIDER = 10;
export function TagList({
  tags,
  maxWidth = DEFAULT_ROW_WIDTH,
  noTagsElement,
  resourceId,
  addResourceTagToFilter,
}: TagListProps): JSX.Element {
  const { classes } = useStyles(maxWidth);
  const [moreModalIsOpen, setMoreModalIsOpen] = useState(false);

  const renderTags = () => {
    if (!tags || tags.length === 0) {
      return noTagsElement;
    }
    // Note: this divider value is not scientific; it was based on trial and error to get the desired number of tags to display
    const displayedTagCount = findDisplayedTagCount(tags, maxWidth / APPROXIMATE_DIVIDER);
    const additionalTagSpace = displayedTagCount === tags.length ? 80 : 160;
    return (
      <>
        {tags.slice(0, displayedTagCount).map((tag) => {
          return (
            <Tag
              key={`${tag.key ?? 'no-key'}-${tag.value}-${resourceId}`}
              tag={tag}
              maxWidth={(maxWidth - additionalTagSpace) / displayedTagCount}
              onClick={() => addResourceTagToFilter?.([getCustomTagLabel(tag)])}
            />
          );
        })}
        {tags.length > displayedTagCount && (
          <MoreTag count={tags.length - displayedTagCount} maxWidth={95} onClick={() => setMoreModalIsOpen(true)} />
        )}
      </>
    );
  };

  const renderModal = () => {
    return (
      <WhyLabsModal title="Applied tags" opened={moreModalIsOpen} onClose={() => setMoreModalIsOpen(false)} centered>
        <div className={classes.modalStack}>
          {tags?.map((tag) => (
            <Tag
              key={`${tag.key ?? 'no-key'}-${tag.value}-${resourceId}`}
              tag={tag}
              maxWidth={MODAL_WIDTH - 80}
              onClick={() => addResourceTagToFilter?.([getCustomTagLabel(tag)])}
            />
          ))}
        </div>
      </WhyLabsModal>
    );
  };
  return (
    <>
      <div className={classes.root}>{renderTags()}</div>
      {renderModal()}
    </>
  );
}

function tagTextLength(tag: CustomTag): number {
  // +1 for colon, +5 for padding
  return (tag.key?.length ?? 0) + tag.value.length + 6;
}

function findDisplayedTagCount(tags: CustomTag[], maxWidth: number): number {
  let totalLength = 0;
  let displayedTagCount = 1;
  for (let i = 0; i < tags.length; i += 1) {
    totalLength += tagTextLength(tags[i]);
    if (totalLength > maxWidth) {
      break;
    }
    displayedTagCount = i + 1;
  }
  return displayedTagCount;
}
