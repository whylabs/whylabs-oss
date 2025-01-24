import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { ColumnCardContentProps } from '../phaseCard';
import { MonitorBaselineOption, monitorBaselineOptions } from '../../CustomMonitorTypes';
import TrailingWindowComponent from './options/TrailingWindowComponent';
import ReferenceProfileComponent from './options/ReferenceProfileComponent';
import TimeRangeComponent from './options/TimeRangeComponent';

type GetBaselineOptionsComponentReturnType = ({
  setContentHeight,
  isPhaseActive,
}: ColumnCardContentProps) => JSX.Element;

const getBaselineOptionsComponent = (type: MonitorBaselineOption): GetBaselineOptionsComponentReturnType => {
  switch (type) {
    case monitorBaselineOptions[0].value:
      return TrailingWindowComponent;
    case monitorBaselineOptions[1].value:
      return ReferenceProfileComponent;
    case monitorBaselineOptions[2].value:
      return TimeRangeComponent;
    default:
      return TrailingWindowComponent;
  }
};

// phase III card II --wide
const MonitorBaselineOptions = ({
  setContentHeight,
  isPhaseActive,
  editMode,
  setHasChanged,
  setWidthSpan,
}: ColumnCardContentProps): JSX.Element => {
  const [{ usedBaseline }] = useRecoilState(customMonitorAtom);
  const SelectedComponent = getBaselineOptionsComponent(usedBaseline);
  return (
    <SelectedComponent
      setContentHeight={setContentHeight}
      isPhaseActive={isPhaseActive}
      editMode={editMode}
      setHasChanged={setHasChanged}
      setWidthSpan={setWidthSpan}
    />
  );
};
export default MonitorBaselineOptions;
