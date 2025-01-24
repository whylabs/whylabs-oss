import {
  DataEvaluationBuilderViewModelProps,
  useDataEvaluationBuilderViewModel,
} from '~/routes/:orgId/dashboard/components/data-evaluation/useDataEvaluationBuilderViewModel';
import { ReactElement } from 'react';

import { DataEvaluationContent } from './components/DataEvaluationContent';

export const DataEvaluationCard = (
  props: Omit<DataEvaluationBuilderViewModelProps, 'isEditWidgetPage'>,
): ReactElement => {
  const viewModel = useDataEvaluationBuilderViewModel({ ...props, isEditWidgetPage: false });

  return <DataEvaluationContent parentViewModel={viewModel} />;
};
