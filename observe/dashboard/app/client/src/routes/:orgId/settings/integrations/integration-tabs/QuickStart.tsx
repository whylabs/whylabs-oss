import { createStyles } from '@mantine/core';
import { IconCopy, IconInfoCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import {
  WhyLabsAlert,
  WhyLabsButton,
  WhyLabsSelect,
  WhyLabsSubmitButton,
  WhyLabsTextInput,
} from '~/components/design-system';
import { CodeBlock } from '~/components/empty-state/components/CodeBlock';
import ExternalLink from '~/components/link/ExternalLink';
import { getOldStackResourcePageUrl } from '~/utils/oldStackUtils';
import { Link } from 'react-router-dom';

import ColabIconSVG from '../assets/ColabIcon.svg';
import WhybotWithContactTooltipSVG from '../assets/whybotWithContactTooltip.svg';
import { IntegrationPageTexts } from '../IntegrationPageTexts';
import { useQuickStartViewModel } from './useQuickStartViewModel';

const MODELS_SELECT_ID = 'models-select';

export const INSTALL_COMMAND = `pip install -q 'whylogs'`;

const PARAGRAPH_STYLE = {
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.25,

  '& > a': {
    color: Colors.linkColor,
  },
};

export const QuickStartTab = (): JSX.Element => {
  const {
    code,
    createdAccessToken,
    exampleLanguageIndex,
    exampleLibIndex,
    exampleOptions,
    getNavUrl,
    isLoading,
    language,
    onChangeExample,
    onCopy,
    onSubmitNewToken,
    orgId,
    profilesFetched,
    resourceOptions,
    resourceType,
    selectedResource,
    selectedResourceId,
    setSelectedResourceId,
    userCanManageTokens,
  } = useQuickStartViewModel();

  const useStyles = createStyles({
    tabRoot: {
      backgroundColor: Colors.white,
      display: 'flex',
      minHeight: '100%',
    },
    leftContent: {
      padding: `12px 0px 12px 50px`,
      maxWidth: 980,
      width: `calc(100% - 360px)`,
    },
    paragraph: {
      ...PARAGRAPH_STYLE,
      marginTop: 30,
    },
    lastStepHeight: {
      height: 60,
    },

    flexRow: {
      alignItems: 'flex-end',
      display: 'flex',
      gap: 10,
      flexDirection: 'row',
    },
    selectResourceSelectorWrapper: {
      width: 450,
      display: 'flex',
      flexDirection: 'column',
    },
    selectLabel: {
      fontFamily: 'Asap',
      fontWeight: 600,
      fontSize: '14px',
      lineHeight: 1.4,
      marginBottom: '4px',
      color: Colors.brandSecondary900,
    },
    selectContainer: {
      marginTop: 0,
    },
    whylabsAlert: {
      width: '100%',
      marginBottom: '10px',
    },
    createApiTokenButton: {
      height: 36,
    },
    apiTokenInstructionsList: {
      fontFamily: 'Asap',
      fontSize: 13,
      fontWeight: 400,
      lineHeight: '20px',
      paddingLeft: 26,
    },
    installWhyLogsCodeBlockWrapper: {
      width: 450,
    },
    colabButtonContainer: {
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',

      '& > span': PARAGRAPH_STYLE,
    },
    iconButton: {
      display: 'inline-block',
      padding: 0,
      paddingLeft: '10px',
      verticalAlign: 'middle',
    },
    openInColabButton: {
      background: 'linear-gradient(180deg, #5F5F5F 0%, #4D4D4D 100%)',
      height: 36,
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    codeClassNameBig: { width: '100%' },
    codeBlock: {
      marginTop: 20,
      overflow: 'auto',
      display: 'flex',
      flexGrow: 1,
      maxWidth: 815,
      width: '100%',
    },
    rightContent: {
      backgroundColor: Colors.white,
      borderRadius: 4,
      width: 360,
    },
    whybotLink: {
      bottom: 0,
      position: 'absolute',
      right: 0,
    },
  });
  const { classes, cx } = useStyles();

  return (
    <div className={classes.tabRoot}>
      <div className={classes.leftContent}>
        <p className={classes.paragraph} style={{ marginTop: 0 }}>
          {IntegrationPageTexts.stepOne(
            <Link
              style={{ color: Colors.linkColor }}
              to={getNavUrl({ page: 'settings', settings: { path: 'resource-management/new' } })}
            >
              here
            </Link>,
          )}
        </p>
        <div className={classes.flexRow}>
          <div className={classes.selectResourceSelectorWrapper}>
            <label htmlFor={MODELS_SELECT_ID} className={classes.selectLabel}>
              {IntegrationPageTexts.selectResourceLabel}
            </label>
            {selectedResource && profilesFetched && (
              <div className={classes.selectContainer}>
                <WhyLabsAlert className={classes.whylabsAlert} icon={<IconInfoCircle size={20} />}>
                  {IntegrationPageTexts.selectedResourceHasProfilesMessage(
                    resourceType.toLowerCase().replace('other', '').trim(),
                  )}
                </WhyLabsAlert>
              </div>
            )}
            <div className={cx(classes.selectContainer)}>
              <WhyLabsSelect
                data={resourceOptions}
                id={MODELS_SELECT_ID}
                label="resources"
                hideLabel
                loading={isLoading}
                onChange={setSelectedResourceId}
                value={selectedResourceId}
              />
            </div>
          </div>
          <WhyLabsSubmitButton
            className={classes.createApiTokenButton}
            onClick={onSubmitNewToken}
            disabled={!userCanManageTokens}
            disabledTooltip={IntegrationPageTexts.noApiPermissions}
          >
            {IntegrationPageTexts.createApiTokenButtonLabel}
          </WhyLabsSubmitButton>
        </div>
        {createdAccessToken && (
          <>
            <div className={classes.flexRow} style={{ marginTop: 10 }}>
              <div className={classes.selectResourceSelectorWrapper}>
                <WhyLabsTextInput
                  disabled
                  disabledTooltip={createdAccessToken}
                  defaultValue={createdAccessToken}
                  hideLabel
                  label="Generated API token"
                  tooltipProps={{
                    maxWidth: 600,
                  }}
                />
              </div>
              <WhyLabsButton color="gray" onClick={onCopy} rightIcon={<IconCopy />} variant="outline">
                Copy token
              </WhyLabsButton>
            </div>
            <ul className={classes.apiTokenInstructionsList}>
              <li>We&apos;ve inserted the API token into the code examples on this page</li>
              <li>You will need to reference the org ID &quot;{orgId}&quot; when using the token</li>
            </ul>
          </>
        )}
        <p className={classes.paragraph}>{IntegrationPageTexts.stepTwo}</p>
        <div className={classes.installWhyLogsCodeBlockWrapper}>
          <CodeBlock lightMode code={INSTALL_COMMAND} language="bash" />
        </div>
        <p className={classes.paragraph}>{IntegrationPageTexts.stepThree}</p>
        <div className={classes.flexRow}>
          <div className={classes.selectResourceSelectorWrapper}>
            <WhyLabsSelect
              data={exampleOptions}
              id="examples-select"
              label={IntegrationPageTexts.selectExampleLabel}
              onChange={onChangeExample}
              searchable={false}
              value={`${exampleLanguageIndex}_${exampleLibIndex}`}
            />
          </div>
          <div className={classes.colabButtonContainer}>
            <span> or </span>
            <ExternalLink className={classes.iconButton} to="colab">
              <WhyLabsButton
                className={classes.openInColabButton}
                leftIcon={<img src={ColabIconSVG} alt="" />}
                variant="filled"
              >
                {IntegrationPageTexts.openInColabButtonLabel}
              </WhyLabsButton>
            </ExternalLink>
          </div>
        </div>
        <div className={classes.content}>
          <CodeBlock
            lightMode
            codeClassName={classes.codeClassNameBig}
            className={classes.codeBlock}
            code={code}
            language={language}
          />
        </div>
        {selectedResourceId && (
          <p className={cx(classes.paragraph, classes.lastStepHeight)}>
            {IntegrationPageTexts.stepFour(
              <a href={getOldStackResourcePageUrl({ resourceId: selectedResourceId, orgId })}>here</a>,
            )}
          </p>
        )}
      </div>
      <aside className={classes.rightContent}>
        <ExternalLink className={classes.whybotLink} to="contactUs">
          <img
            alt="Ready to increase your limits and scale? Contact us to discuss your options!"
            src={WhybotWithContactTooltipSVG}
          />
        </ExternalLink>
      </aside>
    </div>
  );
};
