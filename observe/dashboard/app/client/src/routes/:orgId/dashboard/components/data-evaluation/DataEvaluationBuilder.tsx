import { DataEvaluationContent } from '~/routes/:orgId/dashboard/components/data-evaluation/components/DataEvaluationContent';
import { WidgetBuilderLayout } from '~/routes/:orgId/dashboard/components/WidgetBuilderLayout';
import { ReactElement, useState } from 'react';

import {
  DataEvaluationBuilderViewModelProps,
  useDataEvaluationBuilderViewModel,
} from './useDataEvaluationBuilderViewModel';

type ChildrenProps = {
  widgetBuilderElement: ReactElement;
  handleOnClose: () => void;
};

type DataEvaluationBuilderProps = DataEvaluationBuilderViewModelProps & {
  children: (props: ChildrenProps) => ReactElement;
};
export const DataEvaluationBuilder = ({ children, ...props }: DataEvaluationBuilderProps): ReactElement => {
  const [confirmLosingEditedData, setConfirmLosingEditedData] = useState(false);
  const viewModel = useDataEvaluationBuilderViewModel(props);
  const { onClose } = props;
  const handleOnClose = () => {
    if (viewModel.isEdited) {
      setConfirmLosingEditedData(true);
      return;
    }
    onClose?.();
  };

  const widgetBuilderElement = (
    <WidgetBuilderLayout
      onSaveWidget={viewModel.onSaveWidget}
      onCancel={handleOnClose}
      disableSave={!viewModel.isEdited}
      displayName={viewModel.displayName}
      onChangeDisplayName={viewModel.onChangeDisplayName}
      losingChangesDialog={{
        isOpen: confirmLosingEditedData,
        onCancel: () => setConfirmLosingEditedData(false),
        onConfirm: () => onClose?.(),
      }}
    >
      <DataEvaluationContent parentViewModel={viewModel} />
    </WidgetBuilderLayout>
  );

  return children({ widgetBuilderElement, handleOnClose });
};
