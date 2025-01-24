import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { ColumnCardContentProps } from '../phaseCard';
import { UseCaseOption, useCaseOptions } from '../../CustomMonitorTypes';
import DataPerformanceOptions from './model-performance/ModelPerformanceOptions';
import DataDriftOptions from './data-drift/DataDriftOptions';
import DataQualityOptions from './data-quality/DataQualityOptions';

type GetUseCaseComponentReturnType = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps) => JSX.Element;
const getUseCaseComponent = (useCase: UseCaseOption): GetUseCaseComponentReturnType => {
  switch (useCase) {
    case useCaseOptions[2].value:
      return DataPerformanceOptions;
    case useCaseOptions[0].value:
      return DataDriftOptions;
    case useCaseOptions[1].value:
      return DataQualityOptions;
    default:
      return DataPerformanceOptions;
  }
};

// phase I card II
const MonitorUseCaseOptions = ({
  setContentHeight,
  isPhaseActive,
  editMode,
  setWidthSpan,
  setHasChanged,
}: ColumnCardContentProps): JSX.Element => {
  const [{ useCase }] = useRecoilState(customMonitorAtom);

  const SelectedComponent = getUseCaseComponent(useCase);
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
export default MonitorUseCaseOptions;
