import { createStyles, IconButton, makeStyles, MenuItem, Select, Typography } from '@material-ui/core';
import { useState } from 'react';
import { Cell } from 'fixed-data-table-2';
import { GetModelOverviewInformationQuery, ModelType, useUpdateModelMutation } from 'generated/graphql';
import CreateIcon from '@material-ui/icons/Create';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { Colors } from '@whylabs/observatory-lib';
import { ApolloQueryResult } from '@apollo/client';
import useTypographyStyles from 'styles/Typography';
import { getLabelForModelType } from 'utils/modelTypeUtils';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      height: '100%',
      width: '100%',
    },
    text: {
      margin: 0,
      lineHeight: '1.5',
    },
    contentContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxHeight: 40,
      paddingLeft: 10,
    },
    select: {
      padding: 0,
      '&:focus': {
        background: 'none',
      },
    },
    selectRoot: {
      maxWidth: 110,
      fontSize: '12px',
      borderRadius: '3px',
      padding: '8px 10px',
      border: `1px solid ${Colors.brandSecondary200}`,
      cursor: 'pointer',
    },
    selectMenu: {
      background: Colors.white,
      borderRadius: '3px',
      border: '1px solid rgba(0, 0, 0, 0.25)',
      padding: 0,
    },
    selectItem: {
      fontSize: '12px',
      fontFamily: 'Asap',
      '&:hover': {
        backgroundColor: Colors.brandSecondary100,
      },
    },
    selectedItem: {
      background: 'none !important',
    },
    selectIcon: {
      color: Colors.black,
    },
    editIcon: {
      visibility: 'hidden',
    },
    '@global': {
      '.public_fixedDataTableRow_main': {
        '&:hover $editIcon': {
          visibility: 'visible',
        },
      },
    },
  }),
);

interface ResourceTypeCellProps {
  modelType: ModelType;
  rowIndex: number;
  modelId: string;
  modelName: string;
  refetchData: () => Promise<ApolloQueryResult<GetModelOverviewInformationQuery>>;
  editIndex: number | undefined;
  setEditIndex: (index: number | undefined) => void;
  enableEditing?: boolean;
}

export default function ResourceTypeCell({
  modelType,
  rowIndex,
  modelId,
  modelName,
  refetchData,
  editIndex,
  setEditIndex,
  enableEditing = false,
}: ResourceTypeCellProps): JSX.Element {
  const styles = useStyles();
  const { classes: typography, cx } = useTypographyStyles();
  const { classes: commonStyles } = useCommonStyles();
  const [updateModel] = useUpdateModelMutation();
  const [localModelType, setLocalModelType] = useState<ModelType>(modelType as ModelType);
  const isEditEnabled = modelType !== ModelType.Unknown;
  const isEditable = enableEditing && editIndex === rowIndex;
  const [isLoading, setIsLoading] = useState(false);

  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  function isValueValid(value: unknown): boolean {
    return Object.values(ModelType).includes(value as ModelType);
  }

  async function handleUpdateModel() {
    setEditIndex(undefined);
    setIsLoading(true);
    const response = await updateModel({
      variables: { model: { id: modelId, name: modelName, type: localModelType } },
    });

    if (response.errors) {
      enqueueErrorSnackbar({
        explanation: 'Updating model failed',
        err: undefined,
      });
    } else {
      await refetchData();
      enqueueSnackbar({ title: 'Model updated successfully' });
    }
    setIsLoading(false);
  }

  const renderModelType = () => {
    if (isEditable)
      return (
        <Select
          className={styles.selectRoot}
          disableUnderline
          labelId={`model-selector-${rowIndex}`}
          value={localModelType}
          onChange={(event) => {
            const { value } = event.target;
            if (isValueValid(value)) setLocalModelType(value as ModelType);
          }}
          classes={{
            select: styles.select,
            icon: styles.selectIcon,
          }}
          MenuProps={{
            MenuListProps: {
              className: styles.selectMenu,
            },
          }}
        >
          {Object.values(ModelType).map((val) => (
            <MenuItem
              disabled={localModelType === val}
              className={styles.selectItem}
              classes={{ selected: styles.selectedItem }}
              value={val}
              key={`model-menu-${rowIndex}-${val}`}
            >
              {getLabelForModelType(val)}
            </MenuItem>
          ))}
        </Select>
      );

    return (
      <Typography className={cx(typography.textTable, styles.text, typography.monoFont)}>
        {getLabelForModelType(modelType)}
      </Typography>
    );
  };

  function renderControlIcons(): JSX.Element | null {
    const isUpdatable = modelType === localModelType;

    if (isEditable)
      return (
        <div style={{ minWidth: 60 }}>
          <IconButton
            aria-label="close"
            size="small"
            onClick={() => {
              setLocalModelType(modelType);
              setEditIndex(undefined);
            }}
          >
            <CloseIcon width={10} height={10} style={{ color: Colors.red }} fontSize="small" />
          </IconButton>
          <IconButton disabled={isUpdatable} aria-label="save" size="small" onClick={() => handleUpdateModel()}>
            <CheckIcon width={10} height={10} fontSize="small" />
          </IconButton>
        </div>
      );

    if (!isEditEnabled)
      return (
        <IconButton
          className={styles.editIcon}
          style={{ pointerEvents: 'auto' }}
          aria-label="edit"
          size="small"
          onClick={() => {
            setEditIndex(rowIndex);
          }}
        >
          <CreateIcon width={10} height={10} fontSize="small" />
        </IconButton>
      );

    return null;
  }

  function generateContent() {
    if (isLoading) return <Typography className={cx(styles.text, typography.monoFont)}>Updating...</Typography>;

    return (
      <>
        {renderModelType()}
        {renderControlIcons()}
      </>
    );
  }

  return (
    <Cell className={cx(commonStyles.cellFont, styles.root)}>
      <div className={styles.contentContainer}>{generateContent()}</div>
    </Cell>
  );
}
