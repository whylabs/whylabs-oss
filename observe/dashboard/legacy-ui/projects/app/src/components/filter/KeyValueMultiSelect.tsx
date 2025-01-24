import { createStyles } from '@mantine/core';
import { IconSearch } from '@tabler/icons';
import { WhyLabsButton, WhyLabsMultiSelect } from 'components/design-system';
import { ConcatenationToken, ConcatenationTokenPosition } from 'components/design-system/select/WhyLabsMultiSelect';
import { SegmentTag } from 'generated/graphql';
import { difference } from 'lodash';
import React, { useRef, useState } from 'react';
import { segmentTagToString } from 'utils/segments';

const useStyles = createStyles((_) => ({
  container: {
    width: '100%',
  },
  input: {
    minWidth: 300,
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

export type KeyValueMultiSelectProps = {
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
  selectedPeers: SegmentTag[];
  maxDropdownHeight?: number;
  displayRightButtons?: boolean;
  disabled?: boolean;
};

const KeyValueMultiSelect = ({
  className,
  data,
  label,
  isLoading,
  onChange,
  selectedKey,
  setSelectedKey,
  selectedPeers,
  hideIcon,
  hideLabel,
  labelTooltip,
  placeholder,
  maxDropdownHeight,
  disabled,
  displayRightButtons,
}: KeyValueMultiSelectProps): JSX.Element => {
  const { classes } = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const isSelectKeyMode = !selectedKey;
  const [searchText, setSearchText] = useState('');
  const [selectInFocus, setSelectInFocus] = useState(false);

  const [concatenateMode, setConcatenateMode] = useState(false);

  const selectedOptions = selectedPeers.map(segmentTagToString);

  const multiSelectData = [...data, ...selectedOptions].map((value) => ({
    label: value,
    group: isSelectKeyMode ? 'KEYS' : `${selectedKey} values`,
    value,
  }));

  const concatenateButton = () => {
    if (!displayRightButtons || concatenateMode) return undefined;
    if (selectedPeers?.length && selectInFocus) return undefined;
    return (
      <WhyLabsButton
        ref={addButtonRef}
        size="xs"
        variant="outline"
        color="gray"
        className={classes.andButton}
        onClick={() => {
          setConcatenateMode(true);
          inputRef.current?.focus();
        }}
      >
        AND
      </WhyLabsButton>
    );
  };

  const showAmpersand: ConcatenationToken = (() => {
    let position: ConcatenationTokenPosition = 'afterEach';

    if (!selectInFocus || (selectedPeers?.length && !data.length)) {
      position = 'between';
    }

    return { token: '&', position };
  })();

  return (
    <div className={classes.container} data-testid="KeyValueMultiSelect">
      <div className={classes.input}>
        <WhyLabsMultiSelect
          className={className}
          concatenationToken={showAmpersand}
          onFocus={() => setSelectInFocus(true)}
          onBlur={() => setSelectInFocus(false)}
          onSearchChange={(search) => {
            setSearchText(search);
            if (selectedKey && !search.includes(selectedKey)) {
              setSelectedKey('');
            }
          }}
          searchValue={searchText}
          data={multiSelectData}
          icon={hideIcon ? undefined : <IconSearch size={16} />}
          allowFilterByValue={false}
          label={label}
          rightSection={concatenateButton()}
          maxInputHeight={60}
          labelTooltip={labelTooltip}
          disabled={disabled}
          maxDropdownHeight={maxDropdownHeight}
          hideLabel={hideLabel}
          placeholder={placeholder}
          styles={{ values: { paddingRight: concatenateButton() ? 50 : '' } }}
          nothingFound={getNothingFoundMessage()}
          onChange={handleOnChange}
          ref={inputRef}
          value={selectedOptions}
        />
      </div>
    </div>
  );
  function handleOnChange(updatedValues: string[]) {
    const newItem = difference(updatedValues, selectedOptions)[0];
    // if key pair removed
    if (!newItem) {
      setSelectedKey('');
      onChange(selectedPeers.filter((v) => updatedValues.includes(segmentTagToString(v))));
      return;
    }
    const validData = data.find((v) => v?.toLowerCase() === newItem?.toLowerCase());
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
      setConcatenateMode(false);
      if (selectedKey) setSelectedKey('');

      onChange([...selectedPeers, { key: selectedKey, value: validData.replace(`${selectedKey}=`, '') }]);
      inputRef.current?.blur();
      setTimeout(() => {
        addButtonRef.current?.focus();
      }, 10);
    }
  }

  function getNothingFoundMessage() {
    if (selectedPeers?.length && !data.length) return '';
    if (isLoading) {
      return `Loading ${isSelectKeyMode ? 'keys' : `values for ${selectedKey}`}...`;
    }
    if (!data.length) return 'No options available';
    return 'Nothing found';
  }
};

export default KeyValueMultiSelect;
