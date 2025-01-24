import { useEffect, useRef, useCallback, useState } from 'react';
import { useRecoilState } from 'recoil';
import { RadioGroup, FormControlLabel } from '@material-ui/core';
import '@kenshooui/react-multi-select/dist/style.css';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import MultiSelectModal from 'components/multiselect-modal/MultiSelectModal';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { SegmentItem } from 'hooks/useCustomMonitor/monitorUtils';
import { WhyLabsText } from 'components/design-system';
import RightPanel from '../RightPanel';
import { ColumnCardContentProps } from '../../../phaseCard';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../../../ReadModeMonitorManager';

const radioOptions = [
  {
    value: 'entire',
    label: 'Entire dataset',
    tooltip: '',
  },
  {
    value: 'segments',
    label: 'Selected segments',
    tooltip: '',
  },
] as const;
export type RadioOption = typeof radioOptions[number]['value'];

interface SelectCardViewProps extends ColumnCardContentProps {
  segmentList: SegmentItem[];
}

// phase II card II
const SelectCardView = ({
  setContentHeight,
  setWidthSpan,
  isPhaseActive,
  segmentList,
}: SelectCardViewProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [openModal, setOpenModal] = useState(false);
  const [{ driftOption, discreteType, segments }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);
  const [selectedSegments, setSelectedSegments] = useState<SegmentItem[]>(segments);
  const segmentCount: number = segments.filter((segment) => !!segment.id).length; // This filters out empty string IDs ""
  const [radio, setRadio] = useState<RadioOption>(segmentCount > 0 ? 'segments' : 'entire');

  useEffect(() => {
    if (radio === 'entire') setWidthSpan(1);
    else setWidthSpan(2);
  }, [radio, setWidthSpan, ref]);

  const setNewIncludedSegments = useCallback(
    (newSegments: SegmentItem[]) => setRecoilState((prevState) => ({ ...prevState, segments: newSegments })),
    [setRecoilState],
  );

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
    if (!ref.current && segmentCount === 0) {
      setRadio('entire');
    }
    if (ref.current && radio !== 'entire') {
      setWidthSpan(2);
    }
    if (!ref.current) {
      setWidthSpan(1);
    }
  }, [
    ref.current?.clientHeight,
    setContentHeight,
    isPhaseActive,
    isPhaseActive,
    setWidthSpan,
    driftOption,
    discreteType,
    radio,
    segmentCount,
  ]);

  function getSummaryText() {
    if (radio === 'entire') return 'Entire dataset';

    if (segmentCount === 1) return `${segmentCount} segment selected`;
    if (segmentCount > 0) return `${segmentCount} segments selected`;

    return `No segments  selected`;
  }

  if (!isPhaseActive) return <ReadModeMonitorManager label="Segments" text={getSummaryText()} />;

  return (
    <>
      <div ref={ref} className={styles.columnCardContentWrap} style={{ minHeight: '179px' }}>
        <div className={styles.columnCardFlex}>
          <div className={styles.columnCardContent} style={{ marginLeft: '0px', minWidth: '225px' }}>
            <WhyLabsText inherit className={styles.columnCardText}>
              Do you want to analyze columns in specific segments or in the entire dataset?
            </WhyLabsText>
            <RadioGroup
              value={radio}
              onChange={(element) => {
                const value = element.target.value as RadioOption;
                setRadio(value);
                if (value === 'entire') setNewIncludedSegments([]);

                setSelectedSegments([]);
              }}
            >
              {radioOptions.map((option) => (
                <div key={option.value} style={{ marginBottom: '10px' }}>
                  <FormControlLabel
                    style={{ marginRight: 0 }}
                    value={option.value}
                    label={option.label}
                    className={styles.cardRadioControl}
                    control={<WhyRadio />}
                  />
                  {/* <HtmlTooltip tooltipContent={option.tooltip} /> */}
                </div>
              ))}
            </RadioGroup>
          </div>
          {radio === 'segments' && (
            <RightPanel
              number={segmentCount}
              title={segmentCount > 0 ? 'Total segments selected' : 'No segments selected'}
              buttonText="Select segments"
              onClick={() => {
                setOpenModal(true);
              }}
            />
          )}
        </div>
      </div>

      <MultiSelectModal
        isModalOpen={openModal}
        items={segmentList}
        selectedItems={selectedSegments}
        title={`Select from ${segmentCount} segments`}
        onChange={setSelectedSegments}
        onClose={() => {
          setOpenModal(false);
          setSelectedSegments([...segments]);
        }}
        onCancel={() => {
          setOpenModal(false);
          setSelectedSegments([...segments]);
        }}
        onSave={() => {
          setNewIncludedSegments(selectedSegments);
          setOpenModal(false);
        }}
      />
    </>
  );
};
export default SelectCardView;
