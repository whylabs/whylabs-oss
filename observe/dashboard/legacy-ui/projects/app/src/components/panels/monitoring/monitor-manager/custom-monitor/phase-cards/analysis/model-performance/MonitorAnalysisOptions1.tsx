import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { ChangeTypeOption, changeTypeOptions, DataDriftOption } from '../../../CustomMonitorTypes';
import { ColumnCardContentProps } from '../../phaseCard';
import AbsoluteValueComponent from './options/AbsoluteValueComponent';
import PercentageChangeComponent from './options/PercentageChangeComponent';
import StandardDeviationChangeComponent from './options/StandardDeviationChangeComponent';
import StaticThresholdComponent from './options/StaticThresholdComponent';

type GetAnalysisTypeComponentReturnType = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps) => JSX.Element;
const getAnalysisTypeComponent = (
  type: ChangeTypeOption | DataDriftOption | undefined,
): GetAnalysisTypeComponentReturnType => {
  switch (type) {
    case changeTypeOptions[0].label:
      return PercentageChangeComponent;
    case changeTypeOptions[1].label:
      return AbsoluteValueComponent;
    case changeTypeOptions[2].label:
      return StaticThresholdComponent;
    case changeTypeOptions[3].label:
      return StandardDeviationChangeComponent;
    default:
      return PercentageChangeComponent;
  }
};

// phase II card II
const MonitorAnalysisOptions1 = ({
  setContentHeight,
  isPhaseActive,
  editMode,
  setWidthSpan,
  setHasChanged,
}: ColumnCardContentProps): JSX.Element => {
  const [{ modelPerformanceConfig }] = useRecoilState(customMonitorAtom);
  const SelectedComponent = getAnalysisTypeComponent(modelPerformanceConfig);
  return (
    <SelectedComponent
      setWidthSpan={setWidthSpan}
      setContentHeight={setContentHeight}
      isPhaseActive={isPhaseActive}
      editMode={editMode}
      setHasChanged={setHasChanged}
    />
  );
};
export default MonitorAnalysisOptions1;
