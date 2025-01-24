import { ReactNode } from 'react';

export const IntegrationPageTexts = {
  subHeaderTitle: 'Onboard your datasets and models to WhyLabs for monitoring',
  subHeaderDescription:
    'Using the quick start examples it takes about 5 minutes to onboard to the platform. You’ll use the “whylogs” open source agent to profile your data and then upload to the platform. ',
  quickStartTabLabel: 'Quick start',
  tutorialsTabLabel: 'Tutorials',
  integrationLibraryTabLabel: 'Integration library',
  gettingStartedTitle: 'Getting started with demos and workflows',
  gettingStartedDescription:
    'Try out end-to-end demos and example workflows. Plus resources, help content, and community support. ',
  gettingStartedLinkText: 'Try now',
  selectedResourceHasProfilesMessage: (type: string): string =>
    `The selected ${type} has received profiles in the past`,
  selectResourceLabel: 'Select a dataset or model',
  selectExampleLabel: 'Available examples',
  createApiTokenButtonLabel: 'Create API token',
  noApiPermissions: 'You do not have permission to create an API token in this organization',
  openInColabButtonLabel: 'Open in Colab',
  stepOne: (children: ReactNode): JSX.Element => (
    <>
      1. Create an API token for the dataset or model you want to monitor. New datasets and models can be set up{' '}
      {children}.
    </>
  ),
  stepTwo: '2. Install the latest whylogs version:',
  stepThree: '3. Pick a quick start example to follow:',
  stepFour: (children: ReactNode): JSX.Element => (
    <>
      4. Click {children} to navigate to the selected model or dataset and check that it received data. Now you&apos;re
      ready to start monitoring!
    </>
  ),
};
