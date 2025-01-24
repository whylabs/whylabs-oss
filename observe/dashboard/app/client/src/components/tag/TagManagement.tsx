import { createStyles } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { EDIT_RESOURCE_TAGS, RESOURCE_ID_QUERY_NAME } from '~/utils/searchParamsConstants';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  WhyLabsActionIcon,
  WhyLabsDivider,
  WhyLabsLoadingOverlay,
  WhyLabsSearchInput,
  WhyLabsText,
  WhyLabsTextHighlight,
} from '../design-system';
import { InvisibleButton } from '../misc/InvisibleButton';
import { NONE_TAGS_GROUP, UserDefinedTags, UserTag } from '../tags/UserDefinedTags';

const TAG_SELECTION_BUTTON_HEIGHT = 44;
const SELECTION_CONTAINER_HEIGHT = 500;

const useStyles = createStyles({
  divider: {
    background: Colors.lightGrayBorder,
  },
  loadingContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    height: 200,
    justifyContent: 'center',
    position: 'relative',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 15,
  },
  headerTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    flex: 1,
    '& span': {
      color: 'black',
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.12,
      fontFamily: 'Asap',
    },
  },
  tagsEmptyState: {
    color: Colors.secondaryLight700,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
    fontFamily: 'Asap',
    fontStyle: 'italic',
    height: 16,
  },
  closeButton: {
    border: 'none',
  },
  emptyStateTextContainer: {
    alignItems: 'center',
    display: 'flex',
    height: TAG_SELECTION_BUTTON_HEIGHT,
    padding: '0 12px',

    '& span, p': {
      color: Colors.secondaryLight700,
      fontSize: 14,
      fontStyle: 'italic',
      fontWeight: 300,
    },

    '& a': {
      color: Colors.chartBlue,
      textDecoration: 'none',
    },
  },
  selectionContainer: {
    maxHeight: SELECTION_CONTAINER_HEIGHT,
    overflow: 'hidden',
  },
  selectionScrollableContainer: {
    maxHeight: SELECTION_CONTAINER_HEIGHT,
    overflow: 'auto',
  },
  categoryContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: 10,
    height: TAG_SELECTION_BUTTON_HEIGHT,
    padding: `0 16px`,
    justifyContent: 'space-between',
  },
  categoryText: {
    color: '#ADB5BD',
    fontSize: 14,
    fontWeight: 500,
    textWrap: 'nowrap',
  },
  tagsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 4,
  },
  tagButton: {
    borderRadius: 4,
    cursor: 'pointer',
    height: TAG_SELECTION_BUTTON_HEIGHT,
    padding: 12,

    '&: hover': {
      background: '#F1F3F5',
    },
  },
  tagText: {
    color: Colors.gray900,
    fontSize: 14,
    fontWeight: 400,
  },
  linkButton: {
    color: Colors.linkColor,
    width: 'fit-content',
    fontStyle: 'italic',
  },
});

type TagGroup = {
  name: string;
  tags: string[];
};

export type TagManagementProps = {
  appliedTags: UserTag[];
  availableTags: UserTag[];
  hideAppliedTags?: boolean;
  isLoadingAppliedTags: boolean;
  isLoadingAvailableTags: boolean;
  onRemoveTag: (tag: UserTag) => void;
  onSetTag: (tag: UserTag) => void;
  closeModal?: () => void;
};

export const TagManagement = ({
  appliedTags,
  availableTags,
  hideAppliedTags,
  isLoadingAppliedTags,
  isLoadingAvailableTags,
  onRemoveTag,
  onSetTag,
  closeModal,
}: TagManagementProps) => {
  const { classes } = useStyles();
  const [, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  const openYamlDrawer = useCallback(() => {
    closeModal?.();
    setSearchParams(
      (nextSearchParams) => {
        nextSearchParams.set(EDIT_RESOURCE_TAGS, 'true');
        nextSearchParams.delete(RESOURCE_ID_QUERY_NAME);
        return nextSearchParams;
      },
      { replace: true },
    );
  }, [closeModal, setSearchParams]);

  const lowercasedSearchText = searchText.toLowerCase();

  const findTagFromLabel =
    (label: string) =>
    ({ customTag }: UserTag) => {
      if (customTag.key) return `${customTag.key}:${customTag.value}` === label;

      return customTag.value === label;
    };

  const [groupTags, keysSet, uncategorizedTags] = useMemo(() => {
    const keys = new Set<string>([]);
    const uncategorized: string[] = [];

    const gTags: TagGroup[] = availableTags.reduce((acc: TagGroup[], tag) => {
      const { key, value } = tag.customTag;

      const keyValue = key ? `${key}:${value}` : value;
      if (appliedTags.find(findTagFromLabel(keyValue))) {
        // Skip already applied tags
        return acc;
      }

      // Value only tags are uncategorized
      if (!key || key === NONE_TAGS_GROUP) {
        uncategorized.push(value);
        return acc;
      }

      keys.add(key);

      const group = acc.find((g) => g.name === key);
      if (group) {
        group.tags.push(value);
      } else {
        acc.push({ name: key, tags: [value] });
      }
      return acc;
    }, []);

    return [gTags, Array.from(keys), uncategorized];
  }, [appliedTags, availableTags]);

  const filteredUncategorizedTags = uncategorizedTags
    .filter((tag) => tag.toLowerCase().includes(lowercasedSearchText))
    .sort((a, b) => a.localeCompare(b));

  const filteredGroupTags = groupTags
    .filter((group) => {
      if (selectedKey) return group.name === selectedKey;

      if (appliedTags.find(({ customTag }) => customTag.key === group.name)) {
        // Skip key:value tags that has one of the values already applied
        return false;
      }

      return group.name.toLowerCase().includes(lowercasedSearchText);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const setKeyAndSearchText = ({ key, search }: { key: string; search: string }) => {
    setSelectedKey(key);
    setSearchText(search);
  };

  const onRemove = (tag: UserTag) => () => {
    onRemoveTag(tag);
  };

  const onClickTagKey = (key: string) => () => {
    setKeyAndSearchText({ key, search: '' });
  };

  const onSelectExistingTag = (label: string) => {
    const originalTag = availableTags.find(findTagFromLabel(label));
    if (originalTag) {
      // Use a copy of the original tag to avoid mutating the original tag
      onSetTag(originalTag);

      // Clear the selected key and search text
      setKeyAndSearchText({ key: '', search: '' });
    }
  };

  const onClickSelectedKeyTag = (tag: string) => () => {
    onSelectExistingTag(`${selectedKey}:${tag}`);
  };

  const onClickUncategorizedTag = (tag: string) => () => {
    onSelectExistingTag(`${NONE_TAGS_GROUP}:${tag}`);
  };

  const handleSearchTextChange = (newValue: string) => {
    const newSearchText = (() => {
      const lowercasedNewValue = newValue.toLowerCase();
      if (selectedKey) {
        if (lowercasedNewValue.includes(selectedKey.toLowerCase())) {
          if (!newValue.includes('=')) {
            setSelectedKey('');
            return newValue;
          }
        } else {
          setSelectedKey('');
        }

        return sanitizedSearchTextForValueSelection(newValue);
      }
      if (newValue.includes('=')) {
        const sanitizedKey = newValue.replace('=', '');

        // Verify if the input value is an exact match to a key
        const didMatch = tryToMatchKey(sanitizedKey);
        if (didMatch) return '';
      }

      return newValue;
    })();

    setSearchText(newSearchText);
  };

  if (isLoadingAppliedTags || isLoadingAvailableTags) {
    return (
      <div className={classes.loadingContainer}>
        <WhyLabsLoadingOverlay visible />
      </div>
    );
  }

  const searchValue = (() => {
    if (selectedKey) return `${selectedKey}=${searchText}`;
    return searchText;
  })();

  const renderOptionsSelection = (() => {
    if (!availableTags.length) {
      return renderEmptyState('No tags found');
    }

    if (!groupTags.length && !uncategorizedTags.length) {
      return renderEmptyState('No tags to select');
    }

    return (
      <div className={classes.selectionContainer}>
        <div className={classes.selectionScrollableContainer}>
          {renderGroupTags()}
          {renderUncategorizedTags()}
        </div>
      </div>
    );
  })();

  return (
    <>
      <div className={classes.header}>
        {!hideAppliedTags && (
          <>
            <div className={classes.headerTitle}>
              <span>Selected tags</span>
              <WhyLabsActionIcon
                label="Close tags selector"
                className={classes.closeButton}
                onClick={closeModal}
                size={18}
              >
                <IconX size={16} />
              </WhyLabsActionIcon>
            </div>
            <UserDefinedTags
              tags={appliedTags.map((tag) => ({
                ...tag,
                onDelete: onRemove(tag),
              }))}
              flexWrap
              emptyState={<WhyLabsText className={classes.tagsEmptyState}>No tags selected</WhyLabsText>}
            />
          </>
        )}
        <WhyLabsSearchInput
          autoFocus
          hideLabel
          label="Search tags"
          onChange={handleSearchTextChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              // @ts-expect-error - make TS happy, this is a valid string
              const inputValue: string = event.target.value;

              if (selectedKey) {
                onClickSelectedKeyTag(sanitizedSearchTextForValueSelection(inputValue))();
              } else {
                tryToMatchKey(inputValue);
              }
            }

            if (event.key === 'ArrowDown') {
              // TODO:
            }
          }}
          placeholder="Search..."
          value={searchValue}
        />
      </div>
      <WhyLabsDivider className={classes.divider} size={0} />
      {renderOptionsSelection}
    </>
  );

  function renderGroupTags() {
    const isKeySelectMode = !selectedKey;

    const categoryText = `Tag ${isKeySelectMode ? 'categories' : 'values'}`;

    const renderedOptions = (() => {
      if (isKeySelectMode) {
        if (!filteredUncategorizedTags.length && !filteredGroupTags.length) {
          return renderEmptyState('No matching tags');
        }

        return (
          <>
            {filteredGroupTags.map((group) => (
              <InvisibleButton className={classes.tagButton} key={group.name} onClick={onClickTagKey(group.name)}>
                <WhyLabsTextHighlight className={classes.tagText} highlight={searchText}>
                  {group.name}
                </WhyLabsTextHighlight>
              </InvisibleButton>
            ))}
          </>
        );
      }

      const sanitizedSearchText = sanitizedSearchTextForValueSelection(lowercasedSearchText);

      const selectedKeyOptions = groupTags.find((group) => group.name === selectedKey)?.tags ?? [];
      const filteredSelectedKeyOptions = selectedKeyOptions.filter((v) => v.includes(sanitizedSearchText)).sort();

      if (!filteredSelectedKeyOptions.length) return renderEmptyState('No matching tags');

      return (
        <>
          {filteredSelectedKeyOptions.map((valueTag) => (
            <InvisibleButton className={classes.tagButton} key={valueTag} onClick={onClickSelectedKeyTag(valueTag)}>
              <WhyLabsTextHighlight className={classes.tagText} highlight={sanitizedSearchText}>
                {valueTag}
              </WhyLabsTextHighlight>
            </InvisibleButton>
          ))}
        </>
      );
    })();

    if (isKeySelectMode && !filteredGroupTags.length && filteredUncategorizedTags.length) {
      return null;
    }

    return (
      <>
        <div className={classes.categoryContainer}>
          <WhyLabsText className={classes.categoryText}>{categoryText}</WhyLabsText>
          <WhyLabsDivider className={classes.divider} size={0} />
        </div>
        <div className={classes.tagsContainer}>{renderedOptions}</div>
      </>
    );
  }

  function renderUncategorizedTags() {
    // If a key is selected, do not render uncategorized tags
    if (selectedKey) return null;

    // If there are no uncategorized tags available
    if (!filteredUncategorizedTags.length) return null;

    return (
      <>
        <div className={classes.categoryContainer}>
          <WhyLabsText className={classes.categoryText}>Labels</WhyLabsText>
          <WhyLabsDivider className={classes.divider} size={0} />
        </div>
        <div className={classes.tagsContainer}>
          {filteredUncategorizedTags.map((tag) => (
            <InvisibleButton className={classes.tagButton} key={tag} onClick={onClickUncategorizedTag(tag)}>
              <WhyLabsTextHighlight className={classes.tagText} highlight={searchText}>
                {tag}
              </WhyLabsTextHighlight>
            </InvisibleButton>
          ))}
        </div>
      </>
    );
  }

  function tryToMatchKey(keyValueString: string) {
    // Verify if the value string is an exact match to a key
    const matchedKey = keysSet.find((k) => k.toLowerCase() === keyValueString.toLowerCase());
    if (matchedKey) {
      // Set the key and clear the search text
      setKeyAndSearchText({ key: matchedKey, search: '' });
      return true;
    }

    return false;
  }

  function sanitizedSearchTextForValueSelection(text: string) {
    return text.replace(`${selectedKey}=`, '');
  }

  function renderEmptyState(message: string) {
    return (
      <div className={classes.emptyStateTextContainer}>
        <WhyLabsText>
          {message}. You can edit tags{' '}
          <InvisibleButton className={classes.linkButton} onClick={openYamlDrawer}>
            here
          </InvisibleButton>
          .
        </WhyLabsText>
      </div>
    );
  }
};
