import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { createStyles } from '@mantine/core';
import { basicDark, basicLight } from '@uiw/codemirror-theme-basic';
import CodeMirror from '@uiw/react-codemirror';
import { ReactElement, useMemo } from 'react';
import { SkeletonGroup } from '~/components/design-system';
// Lib docs: https://uiwjs.github.io/react-codemirror/

type WhyLabsCodeEditorProps = {
  language: 'yaml' | 'json';
  height?: string;
  code?: string;
  // onChange handler is recommended to be wrapped in a useCallback such as handle value changes in a debounced state
  onChange?: (value: string) => void;
  theme?: 'dark' | 'light';
  readOnly?: boolean;
  isLoading?: boolean;
};

const useStyles = createStyles(() => ({
  flexRow: {
    display: 'flex',
    gap: 5,
    height: '100%',
  },
  skeletonRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  editor: {
    '& .cm-focused': {
      outline: 'none',
    },
    '& *': {
      fontFamily: 'Inconsolata',
    },
  },
}));

export const WhyLabsCodeEditor = ({
  language,
  height = '200px',
  code,
  onChange,
  theme = 'light',
  readOnly,
  isLoading,
}: WhyLabsCodeEditorProps): ReactElement => {
  const { classes } = useStyles();
  const extensions = useMemo(() => {
    if (language === 'yaml') {
      return [yaml()];
    }
    return [json()];
  }, [language]);

  if (isLoading)
    return (
      <div className={classes.flexRow}>
        <SkeletonGroup count={1} width={30} />
        <div className={classes.skeletonRows}>
          <SkeletonGroup count={20} height={30} mt={2} />
        </div>
      </div>
    );

  return (
    <CodeMirror
      theme={theme === 'light' ? basicLight : basicDark}
      value={code}
      height={height}
      editable={!readOnly}
      extensions={extensions}
      onChange={onChange}
      basicSetup={{ tabSize: 4 }}
      className={classes.editor}
    />
  );
};
