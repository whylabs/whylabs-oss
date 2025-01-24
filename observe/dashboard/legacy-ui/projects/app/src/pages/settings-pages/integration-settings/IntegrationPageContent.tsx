import { useGetProjectDataForIntegrationsQuery } from 'generated/graphql';
import { WhyLabsButton, WhyLabsTabs } from 'components/design-system';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { Link } from 'react-router-dom';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { useIntegrationSettingsStyles } from './IntegrationPageCSS';
import { IntegrationPageTexts } from './IntegrationPageTexts';
import { QuickStartTab } from './integration-tabs/QuickStart';
import { LegacyIntegrationsLibrary } from './integration-tabs/LegacyIntegrationsLibrary';

export const IntegrationPageContent = (): JSX.Element => {
  const { classes } = useIntegrationSettingsStyles();

  const { data, loading: loadingModels } = useGetProjectDataForIntegrationsQuery();
  const { getNavUrl } = useNavLinkHandler();

  useSetHtmlTitle('Integrations');

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <div>
          <h1 className={classes.pageTitle}>{IntegrationPageTexts.subHeaderTitle}</h1>
          <p className={classes.pageDescription}>{IntegrationPageTexts.subHeaderDescription}</p>
        </div>
        <div className={classes.gettingStartedPanel}>
          <h2>{IntegrationPageTexts.gettingStartedTitle}</h2>
          <div className={classes.gettingStartedPanelContentWrapper}>
            <Link to={getNavUrl({ page: 'getStarted' })}>
              <WhyLabsButton color="gray" size="xs" variant="outline">
                {IntegrationPageTexts.gettingStartedLinkText}
              </WhyLabsButton>
            </Link>
            <p>{IntegrationPageTexts.gettingStartedDescription}</p>
          </div>
        </div>
      </div>
      <WhyLabsTabs
        classNames={{
          tabsParent: classes.tabsParent,
          tabsPanel: classes.tabsPanel,
        }}
        tabs={[
          {
            children: <QuickStartTab data={data} loading={loadingModels} />,
            label: IntegrationPageTexts.quickStartTabLabel,
          },
          // {
          //   children: <Tutorials />,
          //   label: IntegrationPageTexts.tutorialsTabLabel,
          // },
          {
            label: IntegrationPageTexts.integrationLibraryTabLabel,
            children: <LegacyIntegrationsLibrary />,
          },
        ]}
      />
    </div>
  );
};
