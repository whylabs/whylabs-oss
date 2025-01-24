import { Link, useLocation } from 'react-router-dom';
import qs from 'query-string';
import {
  WhyLabsAlert,
  WhyLabsButton,
  WhyLabsSelect,
  WhyLabsSubmitButton,
  WhyLabsTextInput,
} from 'components/design-system';
import { IconCopy, IconInfoCircle } from '@tabler/icons';
import { getLabelForModelType } from 'utils/modelTypeUtils';
import WhyLabsCodeBlock from 'components/whylabs-code-block/WhyLabsCodeBlock';
import ExternalLink from 'components/link/ExternalLink';
import { useState } from 'react';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { NullableString } from 'types/genericTypes';
import { GetProjectDataForIntegrationsQuery, ModelType, useGenerateNewAccessTokenMutation } from 'generated/graphql';
import { useUserContext } from 'hooks/useUserContext';
import { Colors } from '@whylabs/observatory-lib';
import { useGetCodeExamples } from 'pages/get-started/components/UploadContent/hooks/useGetCodeExamples';
import { useDeepCompareEffect } from 'hooks/useDeepCompareEffect';
import { EDITING_KEY } from 'types/navTags';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { canManageTokens } from 'utils/permissionUtils';
import ColabIconSVG from '../assets/ColabIcon.svg';
import { IntegrationPageTexts } from '../IntegrationPageTexts';
import { useIntegrationSettingsStyles } from '../IntegrationPageCSS';
import WhybotWithContactTooltipSVG from '../assets/whybotWithContactTooltip.svg';

const MODELS_SELECT_ID = 'models-select';

export const INSTALL_COMMAND = `pip install -q 'whylogs'`;

const COMPONENT_TEXTS = IntegrationPageTexts;

interface QuickStartTabProps {
  data?: GetProjectDataForIntegrationsQuery;
  loading: boolean;
}
export const QuickStartTab: React.FC<QuickStartTabProps> = ({ data, loading }) => {
  const { classes, cx } = useIntegrationSettingsStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { userState, getCurrentUser } = useUserContext();
  const { search } = useLocation();

  const orgId = userState.user?.organization?.id;
  const searchObj = qs.parse(search);
  const resourceIdFromQueryString =
    typeof searchObj[EDITING_KEY] === 'string' ? (searchObj[EDITING_KEY] as string) : null;

  const [selectedResourceId, setSelectedResourceId] = useState<NullableString>(null);
  const user = getCurrentUser();
  const userCanManageTokens = canManageTokens(user);

  const resourceOptions = getResourceOptions();
  const selectedResource = resourceOptions.find((o) => o.value === selectedResourceId);
  const profilesFetched = !!data?.models.find((r) => r.id === selectedResourceId)?.dataAvailability?.hasData;
  const [exampleLanguageIndex, setLanguageIndex] = useState(0);
  const [exampleLibIndex, setLibIndex] = useState(0);
  const [token, setToken] = useState<NullableString>(null);
  const [generateNewAccessToken] = useGenerateNewAccessTokenMutation();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const examples = useGetCodeExamples({
    orgId,
    modelId: selectedResourceId ?? undefined,
    accessToken: token ?? undefined,
    modelName: selectedResource?.label.toString(),
  });
  const { children, language } = examples[exampleLanguageIndex];
  const { code } = children[exampleLibIndex];

  useDeepCompareEffect(() => {
    if (selectedResourceId) return;

    let resourceIdToSelect = resourceOptions?.[0]?.value || null;
    if (resourceIdFromQueryString && resourceOptions.find((r) => r.value === resourceIdFromQueryString)) {
      resourceIdToSelect = resourceIdFromQueryString;
    }

    if (resourceIdToSelect) {
      setSelectedResourceId(resourceIdToSelect);
    }
  }, [resourceOptions, resourceIdFromQueryString, selectedResourceId]);

  const resourceType =
    selectedResource && selectedResource.type !== ModelType.Unknown
      ? getLabelForModelType(selectedResource.type)
      : 'resource';

  return (
    <div className={classes.tabRoot}>
      <main className={classes.leftContent}>
        <p className={classes.paragraph} style={{ marginTop: 0 }}>
          {COMPONENT_TEXTS.stepOne(
            <Link
              style={{ color: Colors.linkColor }}
              to={getNavUrl({ page: 'settings', settings: { path: 'model-management' } })}
            >
              here
            </Link>,
          )}
        </p>
        <div className={classes.flexRow}>
          <div className={classes.selectResourceSelectorWrapper}>
            <label htmlFor={MODELS_SELECT_ID} className={classes.selectLabel}>
              {COMPONENT_TEXTS.selectResourceLabel}
            </label>
            {selectedResource && profilesFetched && (
              <div className={classes.selectContainer}>
                <WhyLabsAlert className={classes.whylabsAlert} icon={<IconInfoCircle size={20} />}>
                  {COMPONENT_TEXTS.selectedResourceHasProfilesMessage(resourceType.toLowerCase())}
                </WhyLabsAlert>
              </div>
            )}
            <div className={cx(classes.selectContainer)}>
              <WhyLabsSelect
                data={resourceOptions}
                id={MODELS_SELECT_ID}
                label=""
                loading={loading}
                onChange={setSelectedResourceId}
                value={selectedResourceId}
              />
            </div>
          </div>
          <WhyLabsSubmitButton
            className={classes.createApiTokenButton}
            onClick={onSubmitNewToken}
            disabled={!userCanManageTokens}
            disabledTooltip={COMPONENT_TEXTS.noApiPermissions}
          >
            {COMPONENT_TEXTS.createApiTokenButtonLabel}
          </WhyLabsSubmitButton>
        </div>
        {token && (
          <>
            <div className={classes.flexRow} style={{ marginTop: 10 }}>
              <div className={classes.selectResourceSelectorWrapper}>
                <WhyLabsTextInput
                  disabled
                  disabledTooltip={token}
                  defaultValue={token}
                  hideLabel
                  label="Generated API token"
                  tooltipProps={{
                    maxWidth: 600,
                  }}
                />
              </div>
              <WhyLabsButton color="gray" onClick={onCopy(token)} rightIcon={<IconCopy />} variant="outline">
                Copy token
              </WhyLabsButton>
            </div>
            <ul className={classes.apiTokenInstructionsList}>
              <li>We&apos;ve inserted the API token into the code examples on this page</li>
              <li>You will need to reference the org ID &quot;{orgId}&quot; when using the token</li>
            </ul>
          </>
        )}

        <p className={classes.paragraph}>{COMPONENT_TEXTS.stepTwo}</p>
        <div className={classes.installWhyLogsCodeBlockWrapper}>
          <WhyLabsCodeBlock lightMode code={INSTALL_COMMAND} language="bash" />
        </div>

        <p className={classes.paragraph}>{COMPONENT_TEXTS.stepThree}</p>
        <div className={classes.flexRow}>
          <div className={classes.selectResourceSelectorWrapper}>
            <WhyLabsSelect
              data={getExampleOptions()}
              id="examples-select"
              label={COMPONENT_TEXTS.selectExampleLabel}
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
                {COMPONENT_TEXTS.openInColabButtonLabel}
              </WhyLabsButton>
            </ExternalLink>
          </div>
        </div>

        <div className={classes.content}>
          <WhyLabsCodeBlock
            lightMode
            codeClassName={classes.codeClassNameBig}
            className={classes.codeBlock}
            code={code}
            language={language}
          />
        </div>

        {selectedResourceId && (
          <p className={classes.paragraph}>
            {COMPONENT_TEXTS.stepFour(
              <Link to={getNavUrl({ page: 'summary', modelId: selectedResourceId })}>here</Link>,
            )}
          </p>
        )}
      </main>
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

  function getResourceOptions() {
    if (!data) return [];

    return data.models.map((model) => ({
      label: `${model.name} (${model.id})`,
      value: model.id,
      type: model.modelType,
    }));
  }

  function getExampleOptions() {
    const list: { label: string; value: string }[] = [];

    examples.forEach((lang, languageIndex) => {
      lang.children.forEach((lib, libIndex) => {
        list.push({
          label: `${lang.label} / ${lib.label}`,
          value: `${languageIndex}_${libIndex}`,
        });
      });
    });

    return list;
  }

  function onChangeExample(indexString: string) {
    const [languageIndex, libIndex] = indexString.split('_');
    setLanguageIndex(parseInt(languageIndex, 10));
    setLibIndex(parseInt(libIndex, 10));
  }

  function onCopy(tokenValue: string) {
    return () => {
      navigator.clipboard.writeText(tokenValue).then(() =>
        enqueueSnackbar({
          title: 'Token copied to clipboard!',
        }),
      );
    };
  }

  function onSubmitNewToken() {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    generateNewAccessToken({
      variables: {
        tokenName: `${userState.user?.name}-API-token`,
        expiresAt: oneYearFromNow.getTime(),
      },
    })
      .then((res) => {
        setToken(res.data?.accessToken.generate.secret ?? null);
        enqueueSnackbar({ title: 'Token created!' });
      })
      .catch((err) => {
        console.error(`Creating access token failed ${err}`);
        enqueueErrorSnackbar({
          explanation: 'Token creation failed',
          err,
        });
      });
  }
};
