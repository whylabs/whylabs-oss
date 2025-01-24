import { createStyles } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { GenericFlexColumnSelectItemData, WhyLabsSelect } from '~/components/design-system';
import { segmentTagToString } from '~/utils/segments';
import { SegmentTag } from '~server/graphql/generated/graphql';
import React, { useMemo, useRef, useState } from 'react';

const useStyles = createStyles((_) => ({
  container: {
    width: '100%',
  },
  input: {
    minWidth: 200,
  },
  valueContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    textTransform: 'inherit',
  },
  andButton: {
    marginRight: 6,
    padding: '2px 8px',
    height: 'fit-content',
    fontWeight: 500,
  },
}));

export type KeyValueSelectProps = {
  className?: string;
  data: string[];
  isLoading?: boolean;
  label: string | React.ReactNode;
  labelTooltip?: string;
  hideIcon?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  onChange(segmentTags: SegmentTag[]): void;
  selectedKey: string;
  setSelectedKey(key: string): void;
  selectedPeer: SegmentTag;
  maxDropdownHeight?: number;
  disabled?: boolean;
  emptyState?: string;
};

const KeyValueSelect = ({
  className,
  data,
  label,
  isLoading,
  onChange,
  selectedKey,
  setSelectedKey,
  selectedPeer,
  hideIcon,
  hideLabel,
  labelTooltip,
  placeholder,
  maxDropdownHeight,
  disabled,
  emptyState,
}: KeyValueSelectProps): JSX.Element => {
  const { classes } = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  const isSelectKeyMode = !selectedKey;
  const [searchText, setSearchText] = useState('');

  const selectedOption = selectedPeer ? segmentTagToString(selectedPeer) : null;

  const selectData = useMemo(() => {
    if (emptyState) return [];
    const mapped: GenericFlexColumnSelectItemData[] = data.map((value) => ({
      label: value,
      group: isSelectKeyMode ? 'KEYS' : `${selectedKey} values`,
      value,
    }));
    if (!mapped.length) {
      mapped.push({
        label: 'Loading...',
        value: '',
        group: 'KEYS',
        disabled: true,
      });
    }
    if (selectedOption) {
      mapped.push({
        label: selectedOption,
        group: isSelectKeyMode ? 'SELECTED' : `${selectedKey} values`,
        value: selectedOption,
      });
    }
    return mapped;
  }, [data, emptyState, isSelectKeyMode, selectedKey, selectedOption]);

  return (
    <div className={classes.container} data-testid="KeyValueSelect">
      <div className={classes.input}>
        <WhyLabsSelect
          className={className}
          selectOnFocus={!!selectedOption}
          onSearchChange={(search) => {
            if (!search && selectedKey) return;
            if (selectedKey && !search.includes('=')) {
              // when you have key-pair selected and then erase the selected value
              setSelectedKey('');
              setSearchText(search);
              return;
            }
            if (selectedKey && selectedOption) {
              // when you have key-pair selected and pick another key
              const currentKey = `${selectedKey}=`;
              setSearchText(search && search.includes(currentKey) ? search : currentKey);
              return;
            }
            if (
              !selectedKey &&
              search !== selectedOption &&
              search.includes('=') &&
              data.includes(search.split('=')[0])
            ) {
              // when you have key-pair selected and erase the value keeping the selectedKey=
              // this will list all the options for that key again
              setSelectedKey(search.split('=')[0]);
            }
            setSearchText(search);
          }}
          searchValue={searchText}
          data={selectData}
          icon={hideIcon ? undefined : <IconSearch size={16} />}
          allowFilterByValue={false}
          label={label}
          maxInputHeight={60}
          labelTooltip={labelTooltip}
          disabled={disabled}
          maxDropdownHeight={maxDropdownHeight}
          hideLabel={hideLabel}
          placeholder={placeholder}
          nothingFound={getNothingFoundMessage()}
          onChange={handleOnChange}
          inputRef={inputRef}
          value={selectedOption}
          clearable
          onDropdownToggle={(isOpen) => {
            if (selectedKey && selectedOption && !isOpen) {
              setSelectedKey('');
              setSearchText(selectedOption);
            }
          }}
        />
      </div>
    </div>
  );
  function handleOnChange(value: string | null) {
    if (!value) {
      setSelectedKey('');
      onChange([]);
      return;
    }
    const validData = data.find((v) => v?.toLowerCase() === value.toLowerCase());
    if (!validData) {
      setSelectedKey('');
      return;
    }

    if (isSelectKeyMode) {
      setSelectedKey(validData);
      setSearchText(`${validData}=`);
      // Hacky way to focus on input to open the dropdown after setting the key
      setTimeout(() => {
        inputRef?.current?.blur();
        inputRef?.current?.focus();
      }, 10);
    } else {
      // when selected a pair of key value correctly
      if (selectedKey) setSelectedKey('');

      onChange([{ key: selectedKey, value: validData.replace(`${selectedKey}=`, '') }]);
      inputRef.current?.blur();
    }
  }

  function getNothingFoundMessage() {
    if (emptyState) return emptyState;
    if (isLoading) {
      return `Loading ${isSelectKeyMode ? 'keys' : `values for ${selectedKey}`}...`;
    }
    if (!data.length) return 'No options available';
    return 'Nothing found';
  }
};

export default KeyValueSelect;
