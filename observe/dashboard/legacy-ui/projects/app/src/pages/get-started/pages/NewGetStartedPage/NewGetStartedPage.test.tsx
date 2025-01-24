import { render, screen, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { mockUseNavLinkHandler } from 'hooks/mocks/mockUseNavLinkHandler';
import userEvent from '@testing-library/user-event';
import * as useIsDemoOrgFile from 'hooks/useIsDemoOrg';
import NewGetStartedPage from './NewGetStartedPage';

const { getByRole } = screen;

const INTEGRATE_SECTION_TITLE = /Integrate in less than 5 minutes/i;

describe('<NewGetStartedPage />', () => {
  beforeEach(() => {
    jest.spyOn(useIsDemoOrgFile, 'useIsDemoOrg').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render whylabs logo', () => {
    getRenderer();
    expect(getByRole('img', { name: 'WhyLabs logo' })).toBeInTheDocument();
  });

  it('should render close button', () => {
    getRenderer();
    expect(getByRole('button', { name: 'close' })).toBeInTheDocument();
  });

  it('should render page title', () => {
    getRenderer();
    expect(getByRole('heading', { name: /getting started with whylabs/i })).toBeInTheDocument();
  });

  it.each([
    /explore demos for data and model monitoring, and for llm security/i,
    /Discover workflows/i,
    INTEGRATE_SECTION_TITLE,
    /Resources/i,
  ])('should render %p section title', (sectionTitle) => {
    getRenderer();
    expect(getByRole('heading', { name: sectionTitle })).toBeInTheDocument();
  });

  describe('handle close', () => {
    const onClose = jest.fn();

    beforeEach(() => {
      mockUseNavLinkHandler({ handleNavigation: onClose });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should close the page when close button is clicked', () => {
      getRenderer();
      expect(onClose).not.toHaveBeenCalled();

      getByRole('button', { name: 'close' }).click();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should close the page when escape key is pressed', () => {
      getRenderer();
      expect(onClose).not.toHaveBeenCalled();

      userEvent.keyboard('{esc}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('explore section', () => {
    it.each([/Data source/i, /Classification model/i, /large language model/i, /llm security/i])(
      'should render %p link',
      (expected) => {
        getRenderer();
        expect(getByRole('link', { name: expected })).toBeInTheDocument();
      },
    );
  });

  describe('discover section', () => {
    it.each([
      /data quality monitoring/i,
      // /constraints validation/i, // TODO: enable this test on #864e6pkd9
      /model drift monitoring/i,
      /performance debugging/i,
      /fairness & bias detection/i,
      /explainability/i,
    ])('should render %p link', (expected) => {
      getRenderer();
      expect(getByRole('link', { name: expected })).toBeInTheDocument();
    });
  });

  describe('integrate section', () => {
    it('should render Set up an integration button', () => {
      getRenderer();
      expect(getByRole('button', { name: /Set up an integration/i })).toBeInTheDocument();
    });

    it('should render the list', () => {
      getRenderer();
      expect(getByRole('list', { name: INTEGRATE_SECTION_TITLE })).toBeInTheDocument();
    });

    it.each([
      'The WhyLabs Platform is integrated with many popular tools and frameworks.',
      'Get started with our demos, code examples, or set up an integration that aligns with your stack.',
      'A full list of integrations can be found here.',
    ])('should render list item %p', (expected) => {
      getRenderer();
      const list = getByRole('list', { name: INTEGRATE_SECTION_TITLE });
      expect(
        within(list)
          .getAllByRole('listitem')
          .find((listItem) => listItem.textContent === expected),
      ).toBeInTheDocument();
    });
  });

  describe('resources section', () => {
    it.each([/tutorials/i, /documentation/i, /ask in the community/i])('should render %p link', (expected) => {
      getRenderer();
      expect(getByRole('link', { name: expected })).toBeInTheDocument();
    });
  });
});

// Helpers
function getRenderer() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <NewGetStartedPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}
