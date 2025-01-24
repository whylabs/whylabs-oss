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
  termsOfUse: 'https://whylabs.ai/terms-of-use',
  privacyPolicy: 'https://whylabs.ai/privacy-policy',
  dataGovernanceDisclosures: 'https://whylabs.ai/data-covernance',
  support: 'https://support.whylabs.ai/hc/en-us/requests/new',
  hellingerDistance: 'https://en.wikipedia.org/wiki/Hellinger_distance',
  youtubeObservabilityPlatform: 'https://www.youtube.com/watch?v=UsDsLEpigBw',
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
  constraintsDocumentation: 'https://docs.whylabs.ai/docs/',
  segmentsDocumentation: 'https://github.com/whylabs/whylogs/blob/mainline/python/examples/advanced/Segments.ipynb',
  secureGuardrailMetrics: 'https://docs.whylabs.ai/docs/secure/guardrail-metrics/',
  badActorsDocumentationUrl: 'https://docs.whylabs.ai/docs/secure/bad-actor-ruleset/',
  misuseDocumentationUrl: 'https://docs.whylabs.ai/docs/secure/misuse-ruleset/',
  costDocumentationUrl: 'https://docs.whylabs.ai/docs/secure/cost-ruleset/',
  customerExperienceDocumentationUrl: 'https://docs.whylabs.ai/docs/secure/customer-experience-ruleset/',
  truthfulnessDocumentationUrl: 'https://docs.whylabs.ai/docs/secure/truthfulness-ruleset/',
  resourcesTaggingDocs: 'https://docs.whylabs.ai/docs/whylabs-overview-observe#resource-tags',
  referenceProfilesDocumentationUrl:
    'https://whylogs.readthedocs.io/en/latest/examples/integrations/writers/Writing_Reference_Profiles_to_WhyLabs.html#Writing-Reference-Profiles-to-WhyLabs',
};

export type ExternalLinkKeys = keyof typeof externalLinks;

export function isValidExternalLink(link: string): link is ExternalLinkKeys {
  return link in externalLinks;
}

export default externalLinks;
