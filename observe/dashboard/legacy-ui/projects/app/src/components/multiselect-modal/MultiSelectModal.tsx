import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { Button, createStyles, makeStyles } from '@material-ui/core';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import CloseIcon from '@material-ui/icons/Close';
import MultiSelect from 'components/multiselect/MultiSelect';
import { MultiSelectItem } from 'components/panels/monitoring/monitor-manager/custom-monitor/phase-cards/analysis/data-drift/SelectCard/useSelectCardData';
import { WhyLabsSelect, WhyLabsSwitch } from '../design-system';

const useStyles = makeStyles(() =>
  createStyles({
    switch: {
      '& input + label': {
        backgroundColor: Colors.brandSecondary600,
        border: 'unset',
      },
      '& input:checked + label': {
        backgroundColor: Colors.brandPrimary600,
      },
    },
    selectFeaturesBtn: {
      backgroundColor: Colors.white,
      '&:hover': {
        backgroundColor: Colors.white,
      },
    },
    dialogBackground: {
      backgroundColor: Colors.white,
    },
    multiSelectWrapper: {
      minWidth: 800,
      border: `1px solid ${Colors.brandSecondary400}`,
      borderRadius: '4px',
      borderColor: `${Colors.brandSecondary400} !important`,
      '& * > *': {
        fontFamily: 'Asap',
        color: Colors.secondaryLight1000,
      },
    },
    footer: {
      padding: '16px 22px 24px 24px',
    },
    saveBtn: {
      background: Colors.brandPrimary900,
      color: 'white',
      boxShadow: 'none',
      '&:hover': {
        background: Colors.brandPrimary800,
      },
    },
    title: {
      fontFamily: 'Asap',
      fontWeight: 600,
      fontSize: '16px',
      lineHeight: '24px',
      color: Colors.secondaryLight1000,
    },
    subtitle: {
      fontFamily: 'Asap',
      fontWeight: 400,
      fontSize: '14px',
      lineHeight: 1.4,
      color: 'black',
      paddingRight: '12px',
    },
    dialogTitle: {
      display: 'flex',
      flexDirection: 'column',
      padding: '0px 24px 16px 24px',
      '& div': {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      '& svg': {
        cursor: 'pointer',
      },
    },
    titleRow: {
      marginTop: '24px',
      '&:last-child': {
        minHeight: '36px',
      },
    },
  }),
);

type SortOption = {
  label: string;
  value: 'weight' | 'name';
};
const SortOptions: SortOption[] = [
  { label: 'Name', value: 'name' },
  { label: 'Feature importance', value: 'weight' },
];

interface MultiSelectModalProps<T> {
  isModalOpen: boolean;
  title: string;
  items: T[];
  selectedItems: T[];
  onChange: Dispatch<SetStateAction<T[]>>;
  onClose: () => void;
  onCancel: () => void;
  onSave: () => void;
  isTopK?: boolean;
  readonly?: boolean;
  enableWeightSorting?: boolean;
}

export default function MultiSelectModal<T extends MultiSelectItem>({
  title,
  items,
  selectedItems,
  isModalOpen,
  onClose,
  onChange,
  onCancel,
  onSave,
  isTopK = false,
  readonly = false,
  enableWeightSorting = false,
}: MultiSelectModalProps<T>): JSX.Element {
  const mStyles = useStyles();
  const [showWeights, setShowWeights] = useState<boolean>(isTopK);
  const [sortOption, setSortOption] = useState<SortOption['value']>(SortOptions[1].value);

  const filteredItems = useMemo(() => {
    if (!enableWeightSorting) return items;
    return items.sort((a, b) => {
      const aWeight = Math.abs(a.weight ?? 0);
      const bWeight = Math.abs(b.weight ?? 0);
      if (sortOption === 'name') return a.label.localeCompare(b.label);
      return bWeight - aWeight;
    });
  }, [enableWeightSorting, items, sortOption]);

  useEffect(() => {
    if (!showWeights && enableWeightSorting) {
      setShowWeights(isTopK);
    }
  }, [enableWeightSorting, showWeights, isTopK]);

  return (
    <Dialog
      open={isModalOpen}
      maxWidth="md"
      onClose={() => {
        onClose();
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle
        id="alert-dialog-title"
        className={mStyles.dialogTitle}
        classes={{
          root: mStyles.dialogBackground,
        }}
      >
        <div className={mStyles.titleRow}>
          <span className={mStyles.title}>{title}</span>
          <CloseIcon onClick={() => onClose()} color="secondary" />
        </div>
        {enableWeightSorting && !readonly && (
          <div className={mStyles.titleRow}>
            <WhyLabsSwitch
              styles={{ label: { fontSize: '14px', lineHeight: 1.4 } }}
              label="Show feature importance scores"
              size="lg"
              defaultChecked={showWeights}
              onChange={(e) => setShowWeights(e.target.checked)}
              disabled={isTopK}
            />
            {showWeights && (
              <div style={{ marginLeft: 'auto' }}>
                <span className={mStyles.subtitle}>Sort by</span>
                <div style={{ width: '180px' }}>
                  <WhyLabsSelect
                    data={SortOptions}
                    loading={false}
                    label=""
                    size="sm"
                    searchable={false}
                    onChange={(value: SortOption['value']) => setSortOption(value)}
                    value={sortOption}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </DialogTitle>
      <DialogContent
        classes={{
          root: mStyles.dialogBackground,
        }}
      >
        <MultiSelect
          showWeights={showWeights}
          items={filteredItems}
          selectedItems={selectedItems}
          onChange={onChange}
          readonly={readonly}
        />
      </DialogContent>
      <DialogActions
        className={mStyles.footer}
        classes={{
          root: mStyles.dialogBackground,
        }}
      >
        <Button
          onClick={() => {
            onCancel();
          }}
          variant="outlined"
        >
          {readonly ? 'Close' : 'Cancel'}
        </Button>
        {!readonly && (
          <Button
            className={mStyles.saveBtn}
            onClick={() => {
              onSave();
            }}
            variant="contained"
            autoFocus
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
