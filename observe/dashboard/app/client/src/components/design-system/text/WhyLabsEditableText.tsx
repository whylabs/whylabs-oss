import { createStyles, getStylesRef } from '@mantine/core';
import { IconCheck, IconPencil, IconX } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { useRef, useState } from 'react';

import WhyLabsActionIcon from '../icon/WhyLabsActionIcon';
import WhyLabsTextInput from '../input/WhyLabsTextInput';
import WhyLabsText from './WhyLabsText';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    width: 'fit-content',
    [`&:hover .${getStylesRef('editActionButton')}`]: {
      opacity: 1,
    },
    minHeight: 36,
  },
  input: {
    width: 380,
  },
  text: {
    color: Colors.darkHeader,
    fontSize: '20px',
    textWrap: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  editActionButton: {
    ref: getStylesRef('editActionButton'),
    opacity: 0,
    transition: 'opacity 0.3s',
  },
}));

type WhyLabsEditableTextProps = {
  className?: string;
  defaultEmptyValue?: string;
  label: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  value: string;
};

export const WhyLabsEditableText = ({
  className,
  defaultEmptyValue,
  label,
  onChange,
  onSave,
  value,
}: WhyLabsEditableTextProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const [editingValue, setEditingValue] = useState<string | null>(null);

  const valueBeforeEditingRef = useRef('');

  const setEditingState = () => {
    valueBeforeEditingRef.current = value;
    const valueToEdit = defaultEmptyValue === value ? '' : value;
    setEditingValue(valueToEdit);
  };

  const cancelIsEditing = () => {
    onChange(valueBeforeEditingRef.current);
    setEditingValue(null);
  };

  const save = () => {
    onSave?.(editingValue || defaultEmptyValue || '');
    setEditingValue(null);
  };

  const handleInputChange = (newValue: string) => {
    setEditingValue(newValue);
    onChange(newValue);
  };

  const isEditing = editingValue !== null;

  const lowercasedLabel = label.toLocaleLowerCase();

  const children = (() => {
    if (isEditing) {
      return (
        <>
          <WhyLabsTextInput
            autoFocus
            className={classes.input}
            defaultValue={editingValue}
            hideLabel
            label={label}
            onChange={handleInputChange}
            onFocus={(event) => {
              event.target.select();
            }}
            placeholder={label}
            onKeyDown={({ key }) => {
              if (key === 'Enter') {
                save();
              }
              if (key === 'Escape') {
                cancelIsEditing();
              }
            }}
          />
          <WhyLabsActionIcon
            color="danger"
            label={`Cancel editing ${lowercasedLabel}`}
            labelAsTooltip
            onClick={cancelIsEditing}
            size={28}
          >
            <IconX size={20} />
          </WhyLabsActionIcon>
          <WhyLabsActionIcon label={`Save ${lowercasedLabel}`} labelAsTooltip onClick={save} size={28}>
            <IconCheck size={20} />
          </WhyLabsActionIcon>
        </>
      );
    }

    return (
      <>
        <InvisibleButton aria-label={`Edit ${label}`} onClick={setEditingState}>
          <WhyLabsText className={classes.text}>{value}</WhyLabsText>
        </InvisibleButton>
        <WhyLabsActionIcon
          className={classes.editActionButton}
          label={`Edit ${lowercasedLabel}`}
          labelAsTooltip
          onClick={setEditingState}
          size={24}
        >
          <IconPencil size={18} />
        </WhyLabsActionIcon>
      </>
    );
  })();

  return (
    <div className={cx(classes.root, className)} data-testid="WhyLabsEditableText">
      {children}
    </div>
  );
};
