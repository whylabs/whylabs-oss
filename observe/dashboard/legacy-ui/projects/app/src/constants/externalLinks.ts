const externalLinks = {
  whylabs: 'https://whylabs.ai',
  whylogs: 'https://whylabs.ai/whylogs',
  whylogsGithub: 'https://github.com/whylabs/whylogs',
  pricing: 'https://whylabs.ai/pricing',
  contactUs: 'https://whylabs.ai/contact-us',
  slackCommunity: 'http://join.slack.whylabs.ai/',
  lendingClub: 'https://www.kaggle.com/wordsforthewise/lending-club',
  dataDictionary: 'https://drive.google.com/file/d/12nYW0NVmiqVHr_O7RDiuf4V7a025dbM8/view',
  documentation: 'https://docs.whylabs.ai/docs/',
  termsOfService: 'https://whylabs.ai/terms-of-service',
  privacyPolicy: 'https://whylabs.ai/privacy-policy',
  dataGovernanceDisclosures: 'https://whylabs.ai/data-covernance',
  support: 'https://support.whylabs.ai/hc/en-us/requests/new',
  hellingerDistance: 'https://en.wikipedia.org/wiki/Hellinger_distance',
  youtubeObservabilityPlatform: 'https://www.youtube.com/playlist?list=PLFDswngT2LSikelAWP_JHUcdsluPACLja',
  colabNotebook:
    'https://colab.research.google.com/github/whylabs/whylogs/blob/mainline/python/examples/integrations/writers/Getting_Started_with_WhyLabsV1.ipynb',
  javaDocumentation: 'https://www.javadoc.io/doc/ai.whylabs/whylogs-core/latest/index.html',
  sageMakerIntegration:
    'https://github.com/whylabs/whylogs/tree/mainline/python/examples/integrations/sagemaker_whylabs_example',
  servingSageMakerFromDocker: 'https://docs.aws.amazon.com/sagemaker/latest/dg/docker-containers.html',
  flaskExample:
    'https://github.com/whylabs/whylogs/blob/mainline/python/examples/integrations/flask_streaming/flask_with_whylogs.ipynb',
  contactLink: 'mailto:enterprise@whylabs.ai',
  colab:
    'https://colab.research.google.com/github/whylabs/whylogs/blob/mainline/python/examples/integrations/writers/Getting_Started_with_WhyLabsV1.ipynb',
  colabSvgSrc: 'https://colab.research.google.com/assets/colab-badge.svg',
  integrationsOverview: 'https://docs.whylabs.ai/docs/integrations-overview',
  whylabsPythonClient: 'https://pypi.org/project/whylabs-client/',
};

export type ExternalLinkKeys = keyof typeof externalLinks;

export function isValidExternalLink(link: string): link is ExternalLinkKeys {
  return link in externalLinks;
}

export default externalLinks;
