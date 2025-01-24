import { ReactNode } from 'react';
import { Accordion } from '@mantine/core';
import { NavLink } from 'react-router-dom';

import { WhyLabsLogo } from 'components/controls/widgets/WhyLabsLogo';
import SidebarMenuButton from 'components/sidebar/SidebarMenuButton';
import { useHowToUseMobile } from 'pages/route-bases/HowToUseMobileCSS';

import tutorialHowToUseMobileIOS from 'ui/tutorialHowToUseMobileIOS.webp';
import tutorialHowToUseMobileAndroid from 'ui/tutorialHowToUseMobileAndroid.webp';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';

const HowToUseMobilePage = (): JSX.Element => {
  const { classes } = useHowToUseMobile();
  const { getNavUrl } = useNavLinkHandler();

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
      </header>
      <div className={classes.content}>
        <NavLink className={classes.anchor} to={getNavUrl({ page: 'getStarted' })}>
          Go back to Get Started.
        </NavLink>
        <section>{renderSectionTitle(<>View on an unsupported device</>)}</section>
        <Accordion bg="white">
          <Accordion.Item value="ios">
            <Accordion.Control>
              <span className={classes.linkTitle}>iPhones</span>
            </Accordion.Control>
            <Accordion.Panel>
              <ol className={classes.stepsList}>
                <li>Open Safari and navigate to the desired site.</li>
                <li>
                  After the website loads, tap the &quot;aA&quot; icon on the left side of the address bar to open the
                  website view menu.
                </li>
                <li>From the pop-up menu, select &quot;Request Desktop Website&quot;.</li>
              </ol>
              <img
                className={classes.stepsImage}
                src={tutorialHowToUseMobileIOS}
                alt="shows a screenshot of how to enable the desktop view on IOS devices"
              />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="android">
            <Accordion.Control>
              <span className={classes.linkTitle}>Android devices</span>
            </Accordion.Control>
            <Accordion.Panel>
              <ol className={classes.stepsList}>
                <li>Open your browser and navigate to the desired site.</li>
                <li>After the website loads, tap on the 3 vertical dots to open the website view menu.</li>
                <li>From the pop-up menu, select the &quot;Desktop site&quot; checkbox.</li>
              </ol>
              <img
                className={classes.stepsImage}
                src={tutorialHowToUseMobileAndroid}
                alt="Shows a screenshot of how to enable the desktop view on Android devices"
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );

  function renderSectionTitle(children: ReactNode, id?: string) {
    return (
      <h2 className={classes.sectionTitle} id={id}>
        {children}
      </h2>
    );
  }
};

export default HowToUseMobilePage;
