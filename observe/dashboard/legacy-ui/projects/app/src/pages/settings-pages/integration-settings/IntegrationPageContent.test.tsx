import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { mockUseWhyLabsSnackbar } from 'hooks/mocks/mockUseSnackbar';
import { MockedProvider } from '@apollo/client/testing';

import { RecoilRoot } from 'recoil';
import { getByTextContent, getSelectedTabContent } from 'utils/testingUtils';
import { IntegrationPageContent } from './IntegrationPageContent';
import { IntegrationPageTexts } from './IntegrationPageTexts';

const { getByRole, getByText } = screen;

describe('<IntegrationPageContent />', () => {
  beforeEach(() => {
    mockUseWhyLabsSnackbar();
  });

  it('should render page title', () => {
    getRenderer();
    expect(getByRole('heading', { name: IntegrationPageTexts.subHeaderTitle })).toBeInTheDocument();
  });

  it('should render page description', () => {
    getRenderer();
    expect(getByTextContent(IntegrationPageTexts.subHeaderDescription)).toBeInTheDocument();
  });

  it('should render getting started title', () => {
    getRenderer();
    expect(getByRole('heading', { name: IntegrationPageTexts.gettingStartedTitle })).toBeInTheDocument();
  });

  it('should render getting started description', () => {
    getRenderer();
    expect(getByTextContent(IntegrationPageTexts.gettingStartedDescription)).toBeInTheDocument();
  });

  it('should render getting started link', () => {
    getRenderer();
    expect(getByRole('link', { name: IntegrationPageTexts.gettingStartedLinkText })).toBeInTheDocument();
  });

  it.each([
    IntegrationPageTexts.quickStartTabLabel,
    // IntegrationPageTexts.tutorialsTabLabel, // TODO
    IntegrationPageTexts.integrationLibraryTabLabel,
  ])('should render %p tab', (tabName) => {
    getRenderer();
    expect(getByRole('tab', { name: tabName })).toBeInTheDocument();
  });

  it('should render quick start tab selected by default', () => {
    getRenderer();
    expect(getSelectedTabContent()).toBe(IntegrationPageTexts.quickStartTabLabel);
  });

  describe('Quick start tab content', () => {
    it('should render Create API token button', () => {
      getRenderer();
      expect(getByRole('button', { name: IntegrationPageTexts.createApiTokenButtonLabel })).toBeInTheDocument();
    });

    it('should render open in colab link', () => {
      getRenderer();
      expect(getByRole('link', { name: IntegrationPageTexts.openInColabButtonLabel })).toBeInTheDocument();
    });

    it('should render selectExampleLabel select field', () => {
      getRenderer();
      expect(getByRole('searchbox', { name: IntegrationPageTexts.selectExampleLabel })).toBeInTheDocument();
    });

    it('should render selectAssetLabel select field', () => {
      getRenderer();
      expect(getByText(IntegrationPageTexts.selectResourceLabel)).toBeInTheDocument();
    });
  });
});

// Helpers
function getRenderer() {
  return render(
    <RecoilRoot>
      <MockedProvider>
        <MantineProvider>
          <MemoryRouter>
            <IntegrationPageContent />
          </MemoryRouter>
        </MantineProvider>
      </MockedProvider>
    </RecoilRoot>,
  );
}
