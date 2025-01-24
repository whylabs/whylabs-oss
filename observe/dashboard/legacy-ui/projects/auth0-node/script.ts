import fs from 'fs';
import logger from 'node-color-log';
import { Liquid } from 'liquidjs';

const engine = new Liquid();

(function main() {
  const mainTemplate = loadMainLiquidTemplate();
  parseLiquidTemplate(mainTemplate).then((html) => outputHTML(html));
})();

function loadMainLiquidTemplate() {
  try {
    logger.color('yellow').log('Loading main template...');
    const mainTemplate = fs.readFileSync('./components/app.liquid.html', { encoding: 'utf8' });
    return mainTemplate;
  } catch (err) {
    logger.color('red').log('Failed to load main template');
    throw err;
  }
}

async function parseLiquidTemplate(liquidHTML: string) {
  try {
    logger.color('yellow').log('Parsing template...');
    const components = getComponentMap();
    const template: string = await engine.parseAndRender(liquidHTML, components);

    return template;
  } catch (err) {
    logger.color('red').log('Failed to parse template...');
    throw err;
  }
}

function getComponentMap() {
  /**
   * Components
   */
  const background = loadComponent('./components/background.liquid.html', { showIllustration: true });
  const backgroundNoIllustration = loadComponent('./components/background.liquid.html');
  const logo = loadComponent('./components/logo.liquid.html');
  const quoteblock = loadComponent('./components/quoteblock.liquid.html');
  const footer = loadComponent('./components/footer.liquid.html');
  const mockLock = loadComponent('./components/lock.liquid.html');

  /**
   * Pages
   */
  const signupPage = loadComponent('./components/signup.liquid.html', {
    background,
    logo,
    quoteblock,
    footer,
    lock: mockLock,
  });

  const loginPage = loadComponent('./components/login.liquid.html', {
    background: backgroundNoIllustration,
    logo,
    lock: mockLock,
  });
  const forgotPasswordPage = loadComponent('./components/forgotpassword.liquid.html', {
    background: backgroundNoIllustration,
    logo,
    lock: mockLock,
  });

  const defaultPage = loadComponent('./components/default-page.liquid.html', {
    background: backgroundNoIllustration,
    logo,
    lock: mockLock,
  });

  return {
    signupPage,
    loginPage,
    forgotPasswordPage,
    defaultPage,
  };
}

async function loadComponent<T extends object>(path: string, props?: T) {
  try {
    const component = fs.readFileSync(path, { encoding: 'utf8' });
    const html: string = await engine.parseAndRender(component, props);

    return html;
  } catch (err) {
    throw err;
  }
}

function outputHTML(html: string) {
  try {
    logger.color('yellow').log('Outputing html...');
    fs.writeFileSync('./index.html', html);
    logger.color('green').log('Done.');
  } catch (err) {
    logger.color('red').log('Failed to output html to index.html');
    throw err;
  }
}
