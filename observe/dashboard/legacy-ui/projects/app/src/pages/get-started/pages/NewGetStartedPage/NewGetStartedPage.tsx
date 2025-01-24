import { AssetCategory } from 'generated/graphql';
import { Center, Flex } from '@mantine/core';
import { WhyLabsLogo } from 'components/controls/widgets/WhyLabsLogo';
import { WhyLabsButton, WhyLabsSubmitButton } from 'components/design-system';
import { IconX, IconInfoCircle } from '@tabler/icons';
import { ReactNode } from 'react';
import { useAuthNavigationHandler, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { ExternalLinkKeys, isValidExternalLink } from 'constants/externalLinks';
import ExternalLink from 'components/link/ExternalLink';
import { PageBases, Pages } from 'pages/page-types/pageType';
import { Link, NavLink } from 'react-router-dom';
import SidebarMenuButton from 'components/sidebar/SidebarMenuButton';
import { useKeyboardEventListener } from 'hooks/useKeyboardEventListener';
import { useIsDemoOrg } from 'hooks/useIsDemoOrg';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { useSemiModalPageStyles } from 'pages/semi-modal/SemiModalPageCSS';

import { getNewStackURL } from 'hooks/useNewStackLinkHandler';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import DocumentationIcon from './assets/documentation-icon.svg';
import SlackIcon from './assets/slack-icon.svg';
import TutorialIcon from './assets/tutorial-icon.svg';
import DataIcon from './assets/data-icon.svg';
import ModelIcon from './assets/model-icon.svg';
import LLMIcon from './assets/llm-icon.svg';
import LLMSecureIcon from './assets/llm-secure-icon.svg';

const INTEGRATE_SECTION_ID = 'integrate-section';

const RESOURCE_ID_PARAM = ':modelId';
const ECOMMERCE_DEMO = 'demo-model-ecommerce';
const LLM_DEMO = 'demo-llm-chatbot';
const LLM_SECURE_DEMO = 'demo-llm-secure';
const EMPLOYEE_DEMO = 'demo-dataset-employee';

const DEMO_ORG_ID_PARAM = `${TARGET_ORG_QUERY_NAME}=demo`;

export type GetStartedLinkItem = {
  category?: AssetCategory;
  id?: string;
  image?: string;
  isDashbirdUiLink?: boolean;
  link: string | ExternalLinkKeys;
  subtitle?: string;
  title: string;
};

const NewGetStartedPage = (): JSX.Element => {
  const { classes, cx } = useSemiModalPageStyles();
  const { handleNavigation, handleNavigationWithoutOrg } = useNavLinkHandler();
  const isDemoOrg = useIsDemoOrg();
  const { getLogoutUri } = useAuthNavigationHandler();

  useSetHtmlTitle('Getting started');
  useKeyboardEventListener({ keydown: { Escape: onClose } });

  return (
    <div className={classes.pageContainer}>
      <div className={classes.botImageBackgroundContainer} />
      <header className={classes.header}>
        <div className={classes.headerLogoContainer}>
          <div className={classes.menuButton}>
            <SidebarMenuButton isDark />
          </div>
          <WhyLabsLogo isDark />
        </div>
        <div className={classes.closeButtonContainer}>
          <WhyLabsButton
            aria-label="close"
            className={classes.closeButton}
            onClick={onClose}
            variant="outline"
            id="getting-started-close-button"
          >
            <IconX size={24} />
          </WhyLabsButton>
          <Link className={classes.logOutButton} to={getLogoutUri()}>
            Log out
          </Link>
        </div>
      </header>
      <div className={classes.content}>
        <Center>
          <h1 className={classes.pageTitle}>Getting Started with WhyLabs</h1>
        </Center>
        <section className={classes.removeInMobile}>
          {renderSectionTitle(
            <>
              Explore demos for <span className={classes.dataTextGradient}>data</span> and{' '}
              <span className={classes.modelTextGradient}>model</span> monitoring, and for{' '}
              <span className={classes.llmSecureTextGradient}>llm security</span>
            </>,
          )}
          {renderLinksContainer(
            getExploreLinks().map((item) =>
              renderLinkCard(
                <>
                  <span className={classes.linkTitle}>{item.title}</span>
                  {renderCardDecorationImage(item.image, classes.exploreLinkIcon)}
                  <span>{item.subtitle}</span>
                </>,
                item,
              ),
            ),
          )}
        </section>
        <section className={classes.removeInMobile}>
          {renderSectionTitle('Discover workflows')}
          {renderLinksContainer(
            getDiscoverLinks().map((item) =>
              renderLinkCard(
                <>
                  <span className={classes.linkTitle}>{item.title}</span>
                  <span>{item.subtitle}</span>
                  <div className={classes.discoverBottomContainer}>
                    <div>
                      <div className={classes.linkDivider} />
                      <span className={classes.linkCategory}>{getWorkflowCategoryText(item.category)}</span>
                    </div>
                    {renderCardDecorationImage(getCategoryImage(item.category), classes.discoverLinkIcon)}
                  </div>
                </>,
                item,
              ),
            ),
          )}
        </section>
        <section>
          <div className={classes.blueBox}>
            <IconInfoCircle size={24} className={classes.blueBoxIcon} />

            <span className={classes.blueBoxTitle}>Unsupported Device</span>
            <span>
              The WhyLabs Platform supports desktop devices. The desktop version can be viewed on your mobile device by
              changing view settings.
              <NavLink
                className={classes.anchor}
                to={PageBases.howToUseMobile}
                style={{ textDecoration: 'underline', marginLeft: '5px' }}
              >
                Learn how to update site view settings.
              </NavLink>
            </span>
          </div>
          {renderSectionTitle('Integrate in less than 5 minutes', INTEGRATE_SECTION_ID)}
          <div className={classes.integrateContainer} id="integration-button">
            <WhyLabsSubmitButton className={classes.integrateButton} onClick={onClickIntegrationButton}>
              Set up an integration
            </WhyLabsSubmitButton>
            <ul className={classes.integrateList} aria-labelledby={INTEGRATE_SECTION_ID}>
              <li>The WhyLabs Platform is integrated with many popular tools and frameworks.</li>
              <li>Get started with our demos, code examples, or set up an integration that aligns with your stack.</li>
              <li>
                A full list of integrations can be found <ExternalLink to="integrationsOverview">here</ExternalLink>.
              </li>
            </ul>
            <span className={classes.normalText}>
              Schedule a demo to learn how WhyLabs can meet your LLM monitoring and observability needs.
            </span>
            <ExternalLink to="contactUs" style={{ textDecoration: 'none' }}>
              <WhyLabsSubmitButton className={classes.scheduleButton}>Schedule a Demo</WhyLabsSubmitButton>
            </ExternalLink>
          </div>
        </section>
        <section>
          {renderSectionTitle('Resources')}
          {renderLinksContainer(
            getResourcesLinks().map((item) =>
              renderLinkCard(
                <>
                  <span className={classes.linkTitle}>{item.title}</span>
                  <span className={classes.resourcesIconContainer}>{renderCardDecorationImage(item.image)}</span>
                  <span>{item.subtitle}</span>
                </>,
                item,
              ),
            ),
          )}
        </section>
      </div>
    </div>
  );

  function renderLinkCard(children: ReactNode, { id, isDashbirdUiLink, category, link, title }: GetStartedLinkItem) {
    const linkContent = (
      <Flex
        id={id}
        className={cx(classes.linkCard, {
          [classes.dataGradient]: category === AssetCategory.Data,
          [classes.modelGradient]: category === AssetCategory.Model,
          [classes.llmSecureGradient]: category === AssetCategory.Llm,
          [classes.blackGradient]: !category,
        })}
        direction="column"
      >
        {children}
      </Flex>
    );

    if (isValidExternalLink(link)) {
      return (
        <ExternalLink key={title} to={link}>
          {linkContent}
        </ExternalLink>
      );
    }

    if (isDashbirdUiLink) {
      return (
        // Can't use react-router Link for Dashbird UI redirect
        <a key={title} href={link}>
          {linkContent}
        </a>
      );
    }

    return (
      <Link key={title} to={link}>
        {linkContent}
      </Link>
    );
  }

  function renderCardDecorationImage(imageSrc?: string, className?: string) {
    if (!imageSrc) return null;
    return <img alt="" className={className} draggable={false} src={imageSrc} />;
  }

  function renderLinksContainer(children: ReactNode) {
    return <div className={classes.linksContainer}>{children}</div>;
  }

  function renderSectionTitle(children: ReactNode, id?: string) {
    return (
      <h2 className={classes.sectionTitle} id={id}>
        {children}
      </h2>
    );
  }

  function getWorkflowCategoryText(category: AssetCategory | undefined) {
    if (category === AssetCategory.Data) return 'DATA WORKFLOW';
    if (category === AssetCategory.Model) return 'ML MODEL WORKFLOW';
    return '';
  }

  function getExploreLinks(): GetStartedLinkItem[] {
    return [
      {
        id: 'data-source-demo',
        category: AssetCategory.Data,
        image: DataIcon,
        link: `${Pages.summary.replace(
          RESOURCE_ID_PARAM,
          EMPLOYEE_DEMO,
        )}?startDate=2023-02-20&endDate=2023-02-27&sortModelBy=LatestAlert&sortModelDirection=DESC&${DEMO_ORG_ID_PARAM}`,
        subtitle: "Explore the platform's data monitoring capabilities",
        title: 'DATA SOURCE',
      },
      {
        id: 'classification-demo',
        category: AssetCategory.Model,
        image: ModelIcon,
        link: `${Pages.summary.replace(
          RESOURCE_ID_PARAM,
          ECOMMERCE_DEMO,
        )}?startDate=2022-12-31&endDate=2023-01-31&sortModelBy=LatestAlert&sortModelDirection=DESC&${DEMO_ORG_ID_PARAM}`,
        subtitle: "Explore the platform's ML model monitoring capabilities",
        title: 'CLASSIFICATION MODEL',
      },
      {
        id: 'llm-demo',
        category: AssetCategory.Model,
        image: LLMIcon,
        link: `${Pages.summary.replace(
          RESOURCE_ID_PARAM,
          LLM_DEMO,
        )}?startDate=2023-06-08&endDate=2023-06-09&sortModelBy=LatestAlert&sortModelDirection=DESC&${DEMO_ORG_ID_PARAM}`,
        subtitle: "Explore the platform's LLM monitoring capabilities",
        title: 'LARGE LANGUAGE MODEL',
      },
      {
        id: 'llm-secure-demo',
        isDashbirdUiLink: true,
        category: AssetCategory.Llm,
        image: LLMSecureIcon,
        link: getNewStackURL({
          path: `${LLM_SECURE_DEMO}/llm-secure/summary`,
          orgId: 'demo',
          searchParams: new URLSearchParams('startDate=2024-04-22T00h00m&endDate=2024-04-23T10h00m&presetRange=custom'),
        }),
        subtitle: 'Explore an LLM secured with guardrails and interaction tracing',
        title: 'LLM SECURITY',
      },
    ];
  }

  function getDiscoverLinks(): GetStartedLinkItem[] {
    return [
      {
        id: 'dq-workflow',
        category: AssetCategory.Data,
        link: `${Pages.features.replace(
          RESOURCE_ID_PARAM,
          EMPLOYEE_DEMO,
        )}/salary?startDate=2023-02-20&endDate=2023-02-27&${DEMO_ORG_ID_PARAM}`,
        subtitle: 'Discover how monitoring for common data quality issues can help avoid pipeline failures',
        title: 'Data quality monitoring',
      },
      // TODO: include link and enable this one on #864e6pkd9
      // {
      //   category: AssetCategory.Data,
      //   link: '/#todo',
      //   subtitle: 'Coming soon! Discover how to enable and monitor row level validations for datasets',
      //   title: 'Constraints validation',
      // },
      {
        id: 'drift-monitoring-workflow',
        category: AssetCategory.Model,
        link: `${Pages.features.replace(
          RESOURCE_ID_PARAM,
          ECOMMERCE_DEMO,
        )}/category?startDate=2022-12-31&endDate=2023-01-31&sortModelBy=LatestAlert&sortModelDirection=DESC&${DEMO_ORG_ID_PARAM}`,
        subtitle: 'Discover how monitoring for model drift can detect training-serving skew',
        title: 'Model drift monitoring',
      },
      {
        id: 'performance-debug-workflow',
        category: AssetCategory.Model,
        link: `${Pages.performance.replace(
          RESOURCE_ID_PARAM,
          ECOMMERCE_DEMO,
        )}?startDate=2022-12-31&endDate=2023-01-31&sortModelBy=LatestAlert&sortModelDirection=DESC&${DEMO_ORG_ID_PARAM}`,
        subtitle: 'Discover how to debug model performance with model to model comparisons',
        title: 'Performance debugging',
      },
      {
        id: 'bias-workflow',
        category: AssetCategory.Model,
        link: `${Pages.segmentAnalysis.replace(
          RESOURCE_ID_PARAM,
          ECOMMERCE_DEMO,
        )}?startDate=2022-12-31&endDate=2023-01-31&${DEMO_ORG_ID_PARAM}`,
        subtitle: 'Discover how to detect biased model performance in sensitive data segments',
        title: 'Fairness & bias detection',
      },
      {
        id: 'explainability-workflow',
        category: AssetCategory.Model,
        link: `${Pages.explainability.replace(
          RESOURCE_ID_PARAM,
          ECOMMERCE_DEMO,
        )}?startDate=2022-12-31&endDate=2023-01-31&${DEMO_ORG_ID_PARAM}`,
        subtitle: 'Discover how view and compare feature weights to enable smart monitoring selections',
        title: 'Explainability',
      },
    ];
  }

  function getResourcesLinks() {
    return [
      {
        id: 'tutorial-card',
        image: TutorialIcon,
        link: 'youtubeObservabilityPlatform',
        subtitle: 'Watch tutorials to help you get started with the platform',
        title: 'Tutorials',
      },
      {
        id: 'documentation-card',
        image: DocumentationIcon,
        link: 'documentation',
        subtitle: 'Visit docs.whylabs.ai for help content and documentation',
        title: 'Documentation',
      },
      {
        id: 'slack-card',
        image: SlackIcon,
        link: 'slackCommunity',
        subtitle: 'Find support or ask questions in our community of practitioners',
        title: 'Ask in the community',
      },
    ];
  }

  function getCategoryImage(category: AssetCategory | undefined) {
    if (category === AssetCategory.Data) return DataIcon;
    if (category === AssetCategory.Model) return ModelIcon;
    if (category === AssetCategory.Llm) return LLMSecureIcon;
    return undefined;
  }

  function onClose() {
    handleNavigation({ page: 'home' });
  }

  function onClickIntegrationButton() {
    const navigateFn = isDemoOrg ? handleNavigationWithoutOrg : handleNavigation;

    navigateFn({ page: 'settings', settings: { path: 'integrations' } });
  }
};

export default NewGetStartedPage;
