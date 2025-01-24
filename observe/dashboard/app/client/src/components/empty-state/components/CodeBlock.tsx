/* eslint-disable prettier/prettier */

// Important: Import Prism must come first before importing any languages
// prettier-ignore
import Prism from 'prismjs';
import React, { useEffect } from 'react';

import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-scala';

import { createStyles } from '@mantine/core';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton } from '~/components/design-system';


import DarkCodeTheme from './themes/DarkCodeTheme';
import LightCodeTheme from './themes/LightCodeTheme';

export const useCodeBlockStyles = createStyles(() => ({
  root: {
    position: 'relative',
    borderRadius: '4px',
    overflowY: 'auto',
  },
  buttons: {
    position: 'absolute',
    top: 6,
    right: 6,
    display: 'flex',
  },
  buttonsAndText: {
    position: 'absolute',
    top: 6,
    right: 6,
    display: 'flex',
    alignContent: 'center',
    flexWrap: 'wrap',
  },
  btn: {
    fontSize: '14px',
    marginLeft: '10px',
    border: '1px solid white',
    color: Colors.white,
  },
  buttonText: {
    fontFamily: 'Asap',
    fontSize: '14px',
    color: Colors.white,
  },
  highlightPre: {
    textAlign: 'left',
    padding: '15px',
    margin: 0,
    overflowX: 'auto',
    '& *': {
      fontFamily: 'Inconsolata',
    },

    '& .token-line': {
      lineHeight: '1.3em',
      height: '1.3em',
    },
  },
}));

export type Language = 'python' | 'java' | 'scala' | 'bash' | 'markup' | 'json';

export interface CodeBlockProps {
  code: string | React.ReactElement;
  language: Language;
  className?: string;
  codeClassName?: string;
  lightMode?: boolean;
  disableCopy?: boolean;
}

/**
 * Guide on how to add new language:
 *  1. Import language from prism "import 'prismjs/components/prism-csharp'""
 *  2. Add that language to our Languages type "export type Language = 'python' | 'java' | 'scala' | 'bash' | 'markup' | 'csharp';"
 *
 * There is automated way of importing languages with babel prism autoloader plugin but due to complicated nature of ejecting react app
 * and then afterwards having to maintain whole configuration, this way seems to be sufficent.
 * Reference to the documentation: https://prismjs.com/#basic-usage-bundlers
 */
export const CodeBlock = ({
  code,
  language,
  className,
  codeClassName,
  lightMode = false,
  disableCopy = false,
}: CodeBlockProps): JSX.Element => {
  const { classes, cx } = useCodeBlockStyles();

  const { enqueueSnackbar } = useWhyLabsSnackbar();


  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  function copyToClipboard() {
    if (typeof code === 'string') {
      navigator.clipboard.writeText(code).then(() =>
      enqueueSnackbar({
        title: 'Code copied!',
      }),
    );
    }
  }

  const CodeTheme = lightMode ? LightCodeTheme : DarkCodeTheme;

  return (
    <CodeTheme>
      <div className={cx(classes.root, className)}>
        <pre className={cx(classes.highlightPre, codeClassName)}>
          <code className={`language-${language}`}>{code}</code>
        </pre>

        <div className={classes.buttons}>
          {typeof code === 'string' && !disableCopy && (
            <WhyLabsButton
              color='gray'
              onClick={copyToClipboard}
              variant="filled"
              size="xs"
            >
              Copy
            </WhyLabsButton>
          )}
        </div>
      </div>
    </CodeTheme>
  );
};
