import { createStyles } from '@mantine/core';

const useLightTheme = createStyles(() => ({
  root: {
    'code[class*="language-"], pre[class*="language-"]': {
      color: '#393A34',
      fontFamily: 'Inconsolata, Consolas, Bitstream Vera Sans Mono, Courier New, Courier, monospace !important',
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      fontSize: '0.875rem !important',
      lineHeight: '1.2em',
      MozTabSize: 4,
      OTabSize: 4,
      tabSize: 4,
      WebkitHyphens: 'none',
      MozHyphens: 'none',
      msHyphens: 'none',
      hyphens: 'none',
    },
    'pre > code[class*="language-"]': {
      fontSize: '0.875rem !important',
    },
    'pre[class*="language-"]::-moz-selection, pre[class*="language-"] ::-moz-selection, code[class*="language-"]::-moz-selection, code[class*="language-"] ::-moz-selection':
      {
        background: '#b3d4fc',
      },
    'pre[class*="language-"]::selection, pre[class*="language-"] ::selection, code[class*="language-"]::selection, code[class*="language-"] ::selection':
      {
        background: '#b3d4fc',
      },
    'pre[class*="language-"]': {
      overflow: 'auto',
      padding: '1.3125rem',
      border: '1px solid #dddddd',
      backgroundColor: '#EBF2F3',
      borderRadius: '4px',
    },
    ':not(pre) > code[class*="language-"]': {
      padding: '.2em',
      paddingTop: '1px',
      paddingBottom: '1px',
      background: '#f8f8f8',
      border: '1px solid #dddddd',
    },
    '.token.comment, .token.prolog, .token.doctype, .token.cdata': {
      color: '#999988',
      fontStyle: 'italic',
    },
    '.token.namespace': {
      opacity: 0.7,
    },
    '.token.string, .token.attr-value': {
      color: '#e3116c',
    },
    '.token.punctuation, .token.operator': {
      color: '#393A34',
    },
    '.token.entity, .token.url, .token.symbol, .token.number, .token.boolean, .token.variable, .token.constant, .token.property, .token.regex, .token.inserted':
      {
        color: '#36acaa',
      },
    '.token.atrule, .token.keyword, .token.attr-name, .language-autohotkey .token.selector': {
      color: '#00a4db',
    },
    '.token.function, .token.deleted, .language-autohotkey .token.tag': {
      color: '#9a050f',
    },
    '.token.tag, .token.selector, .language-autohotkey .token.keyword': {
      color: '#00009f',
    },
    '.token.important, .token.function, .token.bold': {
      fontWeight: 600,
    },
    '.token.italic': {
      fontStyle: 'italic',
    },
  },
}));

const LightCodeTheme: React.FC = ({ children }): JSX.Element => {
  const { classes } = useLightTheme();
  return <div className={classes.root}>{children}</div>;
};

export default LightCodeTheme;
