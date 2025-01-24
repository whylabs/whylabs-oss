import { useState } from 'react';
import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { stringMax, Colors } from '@whylabs/observatory-lib';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import { IconButton } from '@material-ui/core';

import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import CreateIcon from '@material-ui/icons/Create';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import CustomTableTextField from 'components/form-fields/CustomTableTextField';
import { GetModelOverviewInformationQuery, ModelType, useUpdateModelMutation } from 'generated/graphql';
import { ApolloQueryResult } from '@apollo/client';
import { NavLink } from 'react-router-dom';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsTextHighlight, WhyLabsTooltip } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

const useStyles = makeStyles(() =>
  createStyles({
    abbreviatedCell: {
      textOverflow: 'ellipsis',
      maxWidth: '19em',
      lineHeight: 1.5,
    },
    iconContainer: {
      minWidth: '2em',
      flexGrow: 0,
      display: 'flex',
      justifyContent: 'center',
    },
    stuffContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxHeight: 40,
      width: '100%',
      paddingLeft: 10,
    },
    cellButton: {
      textTransform: 'capitalize',
      '&:hover': {
        backgroundColor: '#fff',
      },
    },
    modelId: {
      margin: 0,
      marginTop: 2,
      fontStyle: 'normal',
      fontWeight: 'normal',
      lineHeight: '10px',
      color: Colors.brandSecondary700,
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

interface EndDecoratedModelCellProps extends CellProps {
  modelNames: string[];
  modelIds: string[];
  modelsTypes: ModelType[];
  refetchData: () => Promise<ApolloQueryResult<GetModelOverviewInformationQuery>>;
  editIndex: number | undefined;
  setEditIndex: (index: number | undefined) => void;
  enableEditing?: boolean;
  readonly searchTerm?: string;
}

const DecoratedModelCell: React.FC<EndDecoratedModelCellProps> = ({
  modelNames,
  modelIds,
  rowIndex,
  width,
  height,
  modelsTypes,
  refetchData,
  editIndex,
  setEditIndex,
  enableEditing = false,
  searchTerm,
}) => {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();
  const styles = useStyles();
  const { getNavUrl } = useNavLinkHandler();

  const [updateModel] = useUpdateModelMutation();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [modelName, setModelName] = useState(rowIndex !== undefined ? modelNames[rowIndex] : '');
  const [isLoading, setIsLoading] = useState(false);

  if (rowIndex === undefined) {
    return <Cell />;
  }

  const modelType = modelsTypes[rowIndex];
  const modelId = modelIds[rowIndex];
  const isEditable = enableEditing && editIndex === rowIndex;

  const renderResourceName = () => {
    const resourceName = modelNames[rowIndex];
    if (resourceName.length <= 30)
      return <WhyLabsTextHighlight highlight={searchTerm ?? ''}>{resourceName}</WhyLabsTextHighlight>;

    return (
      <WhyLabsTooltip label={resourceName}>
        <WhyLabsTextHighlight highlight={searchTerm ?? ''}>{stringMax(resourceName, 30)}</WhyLabsTextHighlight>
      </WhyLabsTooltip>
    );
  };

  const renderHighlightWithPrefix = (prefix: string, text: string) => {
    return (
      <>
        {prefix}
        <WhyLabsTextHighlight highlight={searchTerm ?? ''}>{text}</WhyLabsTextHighlight>
      </>
    );
  };
  const renderResourceId = (id: string) => {
    if (id.length <= 30) {
      return renderHighlightWithPrefix('ID: ', id);
    }

    return <WhyLabsTooltip label={id}>{renderHighlightWithPrefix('ID: ', stringMax(id, 16))}</WhyLabsTooltip>;
  };

  const renderName = () => (
    <div className={styles.abbreviatedCell}>
      {isEditable ? (
        <CustomTableTextField
          value={modelName}
          onChange={(event) => {
            const { value } = event.target;
            setModelName(value);
          }}
        />
      ) : (
        <>
          <NavLink
            className={cx(typography.link, commonStyles.linkCell, typography.monoFont)}
            to={getNavUrl({ page: 'summary', modelId })}
          >
            {renderResourceName()}
          </NavLink>
          <p className={cx(typography.textThin, styles.modelId, typography.monoFont)}>{renderResourceId(modelId)}</p>
        </>
      )}
    </div>
  );

  async function handleUpdateModel() {
    setEditIndex(undefined);
    setIsLoading(true);
    const response = await updateModel({ variables: { model: { id: modelId, name: modelName, type: modelType } } });

    if (response.errors) {
      enqueueErrorSnackbar({
        explanation: 'Updating resource failed',
        err: undefined,
      });
    } else {
      await refetchData();
      enqueueSnackbar({ title: 'Resource updated successfully' });
    }
    setIsLoading(false);
  }

  function renderControlIcons(): JSX.Element | null {
    const originalModelName = rowIndex ? modelNames[rowIndex] : null;
    const isUpdatable = modelName === originalModelName;

    if (isEditable)
      return (
        <div>
          <IconButton
            aria-label="edit"
            size="small"
            onClick={() => {
              setEditIndex(undefined);
              setModelName(rowIndex ? modelNames[rowIndex] : ''); // Resets model name to original name
            }}
          >
            <CloseIcon width={10} height={10} style={{ color: Colors.red }} fontSize="small" />
          </IconButton>
          <IconButton disabled={isUpdatable} aria-label="edit" size="small" onClick={() => handleUpdateModel()}>
            <CheckIcon width={10} height={10} fontSize="small" />
          </IconButton>
        </div>
      );

    return (
      <IconButton
        className={styles.editIcon}
        aria-label="edit"
        size="small"
        onClick={() => {
          setEditIndex(rowIndex);
        }}
      >
        <CreateIcon width={10} height={10} fontSize="small" />
      </IconButton>
    );
  }

  function generateContent() {
    if (isLoading) return <p>Updating...</p>;

    return (
      <>
        {renderName()}
        {renderControlIcons()}
      </>
    );
  }

  return (
    <Cell width={width} height={height} className={cx(commonStyles.cellFont, commonStyles.clickity)}>
      <div className={styles.stuffContainer}>{generateContent()}</div>
    </Cell>
  );
};

export default DecoratedModelCell;
