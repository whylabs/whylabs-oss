import { WhyLabsSelect } from 'components/design-system';
import { useResourcesSelectorData } from 'hooks/useResourcesSelectorData';
import { createStyles } from '@mantine/core';

const useSelectStyles = createStyles({
  modelDropdown: {
    width: '300px',
    padding: '10px',
  },
});

export interface ModelsSelectProps {
  onChange(id: string): void;
  readonly selectedModelId: string | null;
  title?: string;
  noTitle?: boolean;
  allowUndefined?: boolean;
  shouldForceReload?: boolean;
  disabled?: string[];
  customStyles?: React.CSSProperties;
}

/**
 * Shows a select/dropdown of all the models in the current org.
 */
export function ModelsSelect({
  onChange,
  selectedModelId,
  title,
  allowUndefined = false,
  shouldForceReload = false,
  customStyles,
  disabled,
}: ModelsSelectProps): JSX.Element | null {
  const { classes: styles } = useSelectStyles();

  const { resourcesList, isLoading } = useResourcesSelectorData({
    displayLabelAs: 'name',
    disabledResourceIds: disabled,
  });

  return (
    <div className={styles.modelDropdown} style={{ marginLeft: 0, ...customStyles }}>
      <WhyLabsSelect
        darkBackground
        data={resourcesList}
        label={title ?? 'Select resource'}
        placeholder="Select a resource"
        clearable={allowUndefined}
        value={selectedModelId}
        loading={isLoading}
        onChange={(value) => {
          onChange(value ?? '');

          if (shouldForceReload) {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
