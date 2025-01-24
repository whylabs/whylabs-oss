import { createStyles } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsCodeEditor } from '~/components/code-editor/WhyLabsCodeEditor';
import { WhyLabsText } from '~/components/design-system';
import { useIsDemoOrg } from '~/hooks/useIsDemoOrg';
import { useLlmTracePolicyContext } from '~/routes/:orgId/:resourceId/llm-trace/policy/useLlmTracePolicyViewModel';
import { ReactElement } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

import { CODE_EDITOR_WIDTH } from '../utils';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    gap: 10,
  },
  banner: {
    display: 'flex',
    justifyContent: 'start',
    gap: 20,
    height: 42,
    alignItems: 'center',
    padding: '10px 15px',
    backgroundColor: Colors.yellowWarningBackground,
    fontFamily: 'Asap',
    fontSize: 14,
    borderRadius: 9,
  },
}));

const EDITOR_WIDTH_INCL_BORDERS = '904px';
const WARNING_MESSAGE =
  'Any rulesets configured in YAML will be disabled in the UI. To enable the UI, you must first remove the ruleset YAML';

export const PolicyAdvancedSettings = (): ReactElement => {
  const { height, ref } = useElementSize();
  const {
    setCurrentAdvancedSettingsYAML,
    advancedSettingsYAML,
    hasLoadingQueries,
    editedAdvancedRulesets,
    isPolicySourceAPI,
  } = useLlmTracePolicyContext();
  const { classes } = useStyles();
  const isDemoOrg = useIsDemoOrg();
  const [searchParams] = useSearchParams();

  if (isPolicySourceAPI) {
    return <Navigate to={{ pathname: './change-history', search: searchParams.toString() }} replace />;
  }

  const renderWarningIfNecessary = () => {
    if (editedAdvancedRulesets.length === 0) {
      return null;
    }
    return (
      <div className={classes.banner} style={{ width: EDITOR_WIDTH_INCL_BORDERS }}>
        <IconInfoCircle size={20} color={Colors.yellowWarning} />
        <WhyLabsText size="sm">{WARNING_MESSAGE}</WhyLabsText>
      </div>
    );
  };
  return (
    <div className={classes.root} ref={ref}>
      {renderWarningIfNecessary()}
      <WhyLabsCodeEditor
        readOnly={!!isDemoOrg}
        language="yaml"
        width={CODE_EDITOR_WIDTH}
        code={advancedSettingsYAML}
        onChange={setCurrentAdvancedSettingsYAML}
        height={`${height}px`}
        isLoading={hasLoadingQueries}
      />
    </div>
  );
};
