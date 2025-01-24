import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import {
  Exact,
  GetAllModelsForSettingsPageQuery,
  ModelUpdateParams,
  useDeleteModelForSettingsPageMutation,
} from 'generated/graphql';
import { ApolloQueryResult } from '@apollo/client';
import { getLabelForModelType, getValidOrUnknownModelType } from 'utils/modelTypeUtils';
import { WhyLabsButton, WhyLabsSelect, WhyLabsTextHighlight, WhyLabsTextInput } from 'components/design-system';
import WhyLabsTable from 'components/design-system/table/WhyLabsTable';
import { SelectItem } from '@mantine/core/lib/Select';
import { isTimePeriod } from 'utils/timePeriodUtils';
import { NullableString } from 'types/genericTypes';
import useDebouncedEffect from 'use-debounced-effect-hook';
import { useState } from 'react';
import { convertAbbreviationToBatchType } from 'adapters/date/timeperiod';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { Link } from 'react-router-dom';
import { useModelSettingsPageContentStyles } from './ModelSettingsPageContentAreaCSS';

interface TableRowForEditProps {
  isEditing: boolean;
  isFreeTier: boolean;
  model: ModelUpdateParams;
  modelTypeOptions: SelectItem[];
  timePeriodOptions: SelectItem[];
  handleHappenedChange: (updatedModel: ModelUpdateParams) => void;
  loading: LoadingField;
  refetch:
    | ((
        variables?:
          | Partial<
              Exact<{
                [key: string]: never;
              }>
            >
          | undefined,
      ) => Promise<ApolloQueryResult<GetAllModelsForSettingsPageQuery>>)
    | undefined;
  readonly searchTerm?: string;
}

export interface LoadingField {
  isLoading: boolean;
  cause: 'update' | 'unknown';
}

const MODEL_DELETED_SUCCESSFULLY = 'Model deleted successfully';

const TableRowForEdit: React.FC<TableRowForEditProps> = ({
  isEditing,
  isFreeTier,
  model,
  modelTypeOptions,
  timePeriodOptions,
  handleHappenedChange,
  loading,
  refetch,
  searchTerm,
}) => {
  const { classes, cx } = useModelSettingsPageContentStyles();
  const [nameValue, setNameValue] = useState<string>(model.name);
  const [typeValue, setTypeValue] = useState<NullableString>(model.type ?? null);
  const [timePeriodValue, setTimePeriodValue] = useState<NullableString>(model.timePeriod ?? null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { getNavUrl } = useNavLinkHandler();

  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [deleteModel, { loading: deleteModelLoading }] = useDeleteModelForSettingsPageMutation();

  useDebouncedEffect(
    () => {
      if (!isEditing) return;
      if (nameValue === model.name && timePeriodValue === model.timePeriod && typeValue === model.type) return;

      handleHappenedChange({
        ...model,
        name: nameValue ?? model.name,
        timePeriod: isTimePeriod(timePeriodValue) ? timePeriodValue : model.timePeriod,
        type: getValidOrUnknownModelType(typeValue ?? model.type),
      });
    },
    [nameValue, timePeriodValue, typeValue],
    500,
  );

  function generateLoadingMessage() {
    if (loading.cause === 'update') return 'Updating...';
    if (deleteModelLoading)
      return (
        <>
          Deleting...
          <CircularProgress size={14} style={{ marginLeft: 12 }} />
        </>
      );

    return 'Loading...';
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
  }

  function onDeleteModel(modelId: string) {
    deleteModel({ variables: { id: modelId } })
      .then(() => {
        if (refetch)
          refetch().then(() => {
            enqueueSnackbar({
              title: MODEL_DELETED_SUCCESSFULLY,
            });
          });
      })
      .catch((err) => {
        console.error(err);
        enqueueSnackbar({
          title: 'Something went wrong',
          variant: 'error',
        });
      });

    handleCloseDialog();
  }

  return (
    <>
      {loading.isLoading || deleteModelLoading ? (
        <WhyLabsTable.Row>
          <WhyLabsTable.Cell colSpan={4}>
            {deleteModelLoading ? (
              <>
                Deleting...
                <CircularProgress size={14} style={{ marginLeft: 12 }} />
              </>
            ) : (
              generateLoadingMessage()
            )}
          </WhyLabsTable.Cell>
        </WhyLabsTable.Row>
      ) : (
        <WhyLabsTable.Row key={`model-id-${model.id}`}>
          <WhyLabsTable.Cell>
            <Link
              className={classes.link}
              to={getNavUrl({
                page: 'summary',
                modelId: model.id,
              })}
            >
              <WhyLabsTextHighlight highlight={searchTerm ?? ''}>{model.id}</WhyLabsTextHighlight>
            </Link>
          </WhyLabsTable.Cell>
          <WhyLabsTable.Cell>{renderNameCell()}</WhyLabsTable.Cell>
          <WhyLabsTable.Cell>{renderTypeCell()}</WhyLabsTable.Cell>
          <WhyLabsTable.Cell>{renderTimePeriodCell()}</WhyLabsTable.Cell>
          {isEditing && (
            <WhyLabsTable.Cell align="right">
              <WhyLabsButton color="danger" variant="outline" onClick={() => setIsDialogOpen(true)}>
                DELETE
              </WhyLabsButton>
            </WhyLabsTable.Cell>
          )}
        </WhyLabsTable.Row>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" style={{ backgroundColor: Colors.white, padding: '20px 25px 10px' }}>
          <Typography component="p" className={classes.dialogTitle}>
            Delete model with ID {model.id}?
          </Typography>
        </DialogTitle>
        <DialogContent style={{ backgroundColor: Colors.white, padding: '10px 25px' }}>
          <Typography id="alert-dialog-description" className={classes.dialogText}>
            All access to profile, monitoring, and performance data for this model will be removed from WhyLabs platform
            immediately.
          </Typography>
          <br />
          <Typography className={classes.dialogText}>
            Data will be permanently deleted after the next scheduled clean-up job.
          </Typography>
        </DialogContent>
        <DialogActions style={{ backgroundColor: Colors.white, padding: '4px 25px 14px' }}>
          <Button onClick={handleCloseDialog} className={cx(classes.dialogButton, classes.dialogButtonCancel)}>
            CANCEL
          </Button>
          <Button
            onClick={() => {
              onDeleteModel(model.id);
            }}
            className={classes.dialogButton}
          >
            CONFIRM DELETE
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  function renderNameCell() {
    if (isEditing) {
      return <WhyLabsTextInput hideLabel label="Model or dataset name" onChange={onChangeName} value={nameValue} />;
    }
    return <WhyLabsTextHighlight highlight={searchTerm ?? ''}>{model.name}</WhyLabsTextHighlight>;
  }

  function renderTypeCell() {
    if (isEditing) {
      return (
        <WhyLabsSelect
          data={modelTypeOptions}
          hideLabel
          label="Resource type"
          onChange={onChangeType}
          value={typeValue}
        />
      );
    }
    return (
      <WhyLabsTextHighlight highlight={searchTerm ?? ''}>
        {getLabelForModelType(getValidOrUnknownModelType(model.type))}
      </WhyLabsTextHighlight>
    );
  }

  function renderTimePeriodCell() {
    if (isEditing && !isFreeTier) {
      return (
        <WhyLabsSelect
          data={timePeriodOptions}
          hideLabel
          label="Batch frequency"
          onChange={onChangeTimePeriod}
          value={timePeriodValue}
        />
      );
    }
    return model.timePeriod ? (
      <WhyLabsTextHighlight highlight={searchTerm ?? ''}>
        {convertAbbreviationToBatchType(model.timePeriod)}
      </WhyLabsTextHighlight>
    ) : (
      'N/A'
    );
  }

  function onChangeName(newValue: string) {
    setNameValue(newValue);
  }

  function onChangeType(newValue: NullableString) {
    setTypeValue(newValue);
  }

  function onChangeTimePeriod(newValue: NullableString) {
    setTimePeriodValue(newValue);
  }
};
export default TableRowForEdit;
