import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import { createStyles } from '@mantine/core';
import { RadioGroup, FormControlLabel, Button } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import mv3CardBackground from 'ui/mv3-card-background.svg';
import MultiSelect from '@kenshooui/react-multi-select';
import '@kenshooui/react-multi-select/dist/style.css';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../../phaseCard';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';

const useMonitorAnalysis2Styles = createStyles({
  columnCardSide: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    '& > *': {
      position: 'relative',
      zIndex: 2,
    },
    '& > img': {
      position: 'absolute',
      top: 0,
      transform: 'translate(0%, -10%)',
      zIndex: 1,
      height: 300,
    },
  },
  columnCardNumber: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: '36px',
    lineHeight: '44px',
    textAlign: 'center',
    color: Colors.brandPrimary900,
    margin: '22px 0',
  },
  selectFeaturesBtn: {
    backgroundColor: Colors.white,
    '&:hover': {
      backgroundColor: Colors.white,
    },
  },
  selectFeaturesBtnDisabled: {
    visibility: 'hidden',
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
    // Border colors
    '& > div[class*="kn-column__column___"], & [class*="kn-selection_status__selection_status___"], & [class*="kn-search__search___"], & [class*="kn-item__with_border___"]':
      {
        borderColor: `${Colors.brandSecondary400} !important`,
      },
    // narrowed div from 400 => 399, so border is visible
    '& [class*="kn-item__with_border___"]': {
      width: 399,
    },
    // checkboxes' color
    '& [class*="kn-item__"] span span svg': {
      fill: `${Colors.brandSecondary700} !important`,
    },
    // checkboxes' checked color
    '& [class*="kn-item__selected___"] span span svg': {
      fill: `${Colors.brandPrimary900} !important`,
    },
    // "clear all" button
    '& [class*="kn-selection_status__clear_all___"]': {
      color: Colors.brandPrimary900,
    },
    // hovered row
    '& [class*="kn-item__item___"]:hover': {
      backgroundColor: Colors.brandSecondary100,
    },
    // selected row
    '& [class*="kn-item__selected___"]': {
      backgroundColor: Colors.brandSecondary100,
    },
  },
  saveBtn: {
    background: Colors.brandPrimary900,
    boxShadow: 'none',
  },
});

const radioOptions = [
  {
    value: 'all',
    label: 'All features selected',
  },
  {
    value: 'manual',
    label: 'Manually select features',
  },
] as const;
export type RadioOption = typeof radioOptions[number]['value'];

interface MultiSelectItem {
  id: string;
  label: string;
}

// phase II card II
const MonitorAnalysisOptions2 = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const { classes: mStyles } = useMonitorAnalysis2Styles();
  const [openModal, setOpenModal] = useState(false);
  const [{ driftOption, discreteType, includedFeatures, featuresQueryData: data }, setRecoilState] =
    useRecoilState(customMonitorAtom);
  const [selectedFeatures, setSelectedFeatures] = useState<MultiSelectItem[]>([]);
  const [radio, setRadio] = useState<RadioOption>(radioOptions[0].value);
  const ref = useRef<HTMLDivElement>(null);
  const firstLoad = useRef<boolean>(true);

  const inputs = useMemo(() => {
    const unfilteredData =
      data?.model?.features.map((input) => {
        const isDiscrete = Boolean(input.schema?.isDiscrete);
        return { id: input.id, label: input.name, isDiscrete };
      }) || [];
    return unfilteredData.filter((item) => (discreteType === 'discrete' ? item.isDiscrete : !item.isDiscrete));
  }, [data?.model?.features, discreteType]);

  const outputs = useMemo(() => {
    const unfilteredData =
      data?.model?.outputs.map((output) => {
        const isDiscrete = Boolean(output.schema?.isDiscrete);
        return { id: output.id, label: output.name, isDiscrete };
      }) || [];
    return unfilteredData.filter((item) => (discreteType === 'discrete' ? item.isDiscrete : !item.isDiscrete));
  }, [data?.model?.outputs, discreteType]);

  const usedFeatures: MultiSelectItem[] = useMemo(() => {
    return driftOption === 'input' ? inputs : outputs;
  }, [driftOption, inputs, outputs]);

  const setNewIncludedFeatures = useCallback(
    (newIncludedFeatures: string[]) =>
      setRecoilState((prevState) => ({ ...prevState, includedFeatures: newIncludedFeatures })),
    [setRecoilState],
  );

  useEffect(() => {
    if (data?.model && firstLoad.current) {
      if (driftOption === 'input') {
        const newSelectedInputs = data.model.features.filter((input) => includedFeatures.includes(input.name));
        const newSelectedFeatures =
          newSelectedInputs.map((input) => {
            const isDiscrete = Boolean(input.schema?.isDiscrete);
            return { id: input.id, label: input.name, isDiscrete };
          }) || [];
        setSelectedFeatures(newSelectedFeatures);
        setRadio(newSelectedInputs.length === 0 ? radioOptions[0].value : radioOptions[1].value);
      } else {
        const newSelectedOutputs = data?.model.outputs.filter((output) => includedFeatures.includes(output.name));
        const newSelectedFeatures =
          newSelectedOutputs.map((output) => {
            const isDiscrete = Boolean(output.schema?.isDiscrete);
            return { id: output.id, label: output.name, isDiscrete };
          }) || [];
        setSelectedFeatures(newSelectedFeatures);
        setRadio(newSelectedOutputs.length === 0 ? radioOptions[0].value : radioOptions[1].value);
      }
      firstLoad.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, isPhaseActive, driftOption, discreteType, radio]);

  const displaySelectedNumber = radio === radioOptions[0].value ? usedFeatures.length : includedFeatures.length;

  if (!isPhaseActive)
    return (
      <WhyLabsText inherit className={styles.columnCompleteStateComponent}>
        {displaySelectedNumber} selected features
      </WhyLabsText>
    );

  const disableSelectionBtn = radio !== radioOptions[1].value;
  return (
    <>
      <div ref={ref} className={styles.columnCardContentWrap}>
        <div className={styles.columnCardFlex}>
          <div className={styles.columnCardContent}>
            <WhyLabsText inherit className={styles.columnCardTitle}>
              {upperCaseFirstLetterOnly(discreteType ?? 'discrete')} {driftOption} features
            </WhyLabsText>
            <WhyLabsText inherit className={styles.columnCardText}>
              Select the features you want to target for analysis.
            </WhyLabsText>
            <RadioGroup
              value={radio}
              onChange={(element) => {
                const value = element.target.value as RadioOption;
                setRadio(value);
                setNewIncludedFeatures([]);
              }}
            >
              {radioOptions.map((option) => (
                <FormControlLabel
                  key={`${option.value}`}
                  value={option.value}
                  label={option.label}
                  className={styles.cardRadioControl}
                  control={<WhyRadio />}
                />
              ))}
            </RadioGroup>
          </div>
          <div className={mStyles.columnCardSide}>
            <img src={mv3CardBackground} alt="card background" />
            <WhyLabsText inherit className={cx(styles.columnCardTitle, styles.columnCardTextCenter)}>
              {displaySelectedNumber ? 'Total' : 'No'} features selected
            </WhyLabsText>
            {Boolean(displaySelectedNumber) && (
              <WhyLabsText inherit className={mStyles.columnCardNumber}>
                {displaySelectedNumber}
              </WhyLabsText>
            )}
            <Button
              onClick={() => setOpenModal(true)}
              variant="outlined"
              className={cx(mStyles.selectFeaturesBtn, disableSelectionBtn && mStyles.selectFeaturesBtnDisabled)}
              disabled={disableSelectionBtn}
            >
              Select features
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={openModal}
        maxWidth="md"
        onClose={() => setOpenModal(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle
          id="alert-dialog-title"
          classes={{
            root: mStyles.dialogBackground,
          }}
        >
          Select from {usedFeatures?.length} {discreteType} features
        </DialogTitle>
        <DialogContent
          classes={{
            root: mStyles.dialogBackground,
          }}
        >
          <MultiSelect
            wrapperClassName={mStyles.multiSelectWrapper}
            items={usedFeatures}
            height={600}
            selectedItems={selectedFeatures}
            onChange={setSelectedFeatures}
          />
        </DialogContent>
        <DialogActions
          classes={{
            root: mStyles.dialogBackground,
          }}
        >
          <Button onClick={() => setOpenModal(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            className={mStyles.saveBtn}
            onClick={() => {
              setNewIncludedFeatures(selectedFeatures.map((f) => f.label));
              setOpenModal(false);
              setSelectedFeatures([]);
            }}
            variant="contained"
            color="primary"
            autoFocus
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default MonitorAnalysisOptions2;
