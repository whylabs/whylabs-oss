import airflowLogo from '../assets/integration-logos/airflow.png';
import anyscaleLogo from '../assets/integration-logos/anyscale.svg';
import awsLogo from '../assets/integration-logos/aws.svg';
import azureLogo from '../assets/integration-logos/azure.svg';
import azureMLLogo from '../assets/integration-logos/azureML.png';
import bentoMLLogo from '../assets/integration-logos/bentoML.svg';
import confluentLogo from '../assets/integration-logos/confluent.png';
import dagsterLogo from '../assets/integration-logos/dagster.png';
import daskLogo from '../assets/integration-logos/dask.png';
import databricksLogo from '../assets/integration-logos/databricks.svg';
import dvcLogo from '../assets/integration-logos/dvc.png';
import emailLogo from '../assets/integration-logos/email.svg';
import fastAPILogo from '../assets/integration-logos/fastAPI.svg';
import feastLogo from '../assets/integration-logos/feast.png';
import featureFormLogo from '../assets/integration-logos/featureForm.png';
import flaskLogo from '../assets/integration-logos/flask.svg';
import flyteLogo from '../assets/integration-logos/flyte.png';
import gcpLogo from '../assets/integration-logos/gcp.png';
import hopsworksLogo from '../assets/integration-logos/hopsworks.png';
import kafkaLogo from '../assets/integration-logos/kafka.svg';
import kedroLogo from '../assets/integration-logos/kedro.png';
import mlFlowLogo from '../assets/integration-logos/mlFlow.svg';
import modinLogo from '../assets/integration-logos/modin.svg';
import neptuneAILogo from '../assets/integration-logos/neptuneAI.svg';
import nimbleboxLogo from '../assets/integration-logos/nimblebox.svg';
import onPremiseLogo from '../assets/integration-logos/onPremise.svg';
import pachydermLogo from '../assets/integration-logos/pachyderm.png';
import pagerDutyLogo from '../assets/integration-logos/pagerDuty.svg';
import pandasLogo from '../assets/integration-logos/pandas.svg';
import predibaseLogo from '../assets/integration-logos/predibase.svg';
import prefectLogo from '../assets/integration-logos/prefect.png';
import rayLogo from '../assets/integration-logos/ray.svg';
import sageMakerLogo from '../assets/integration-logos/sageMaker.svg';
import seldonLogo from '../assets/integration-logos/seldon.svg';
import serviceNowLogo from '../assets/integration-logos/serviceNow.svg';
import slackLogo from '../assets/integration-logos/slack.svg';
import snorkelLogo from '../assets/integration-logos/snorkel.svg';
import snowflakeLogo from '../assets/integration-logos/snowflake.svg';
import sparkLogo from '../assets/integration-logos/spark.svg';
import superbAiLogo from '../assets/integration-logos/superbAi.svg';
import teachableHubLogo from '../assets/integration-logos/teachableHub.svg';
import tectonLogo from '../assets/integration-logos/tecton.png';
import teradataLogo from '../assets/integration-logos/teradata.svg';
import tolokaLogo from '../assets/integration-logos/toloka.png';
import ubiOpsLogo from '../assets/integration-logos/ubiOps.svg';
import valohaiLogo from '../assets/integration-logos/valohai.svg';
import vertexHubLogo from '../assets/integration-logos/vertex.png';
import weightsAndBiasesLogo from '../assets/integration-logos/weightsAndBiases.svg';
import zenMlLogo from '../assets/integration-logos/zenMl.png';

export const integrationsLibrary = [
  {
    title: 'Clouds',
    cards: [
      {
        title: 'AWS',
        logo: awsLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/integrations-cloud/#aws',
        description:
          'Switch on WhyLabs observability in a few clicks in the AWS Marketplace. We are AWS experts, so bring your toughest ML monitoring challenges over.',
      },
      {
        title: 'Databricks',
        logo: databricksLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/integrations-databricks',
        description:
          'Big data pipelines, distributed data pipelines, AutoML pipelines, Databricks model serving... all of these can be monitored today.',
      },
      {
        title: 'Azure',
        logo: azureLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/integrations-cloud#microsoft-azure',
        description: 'If you call Azure your home, switching on WhyLabs is as easy as adding three lines of code.',
      },
      {
        title: 'Google Cloud',
        logo: gcpLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/integrations-cloud/#google-cloud-platform-gcp',
        description: 'WhyLabs can monitor your hybrid & multi-cloud data and ML solutions hosted on GCP.',
      },
      {
        title: 'Confluent',
        logo: confluentLogo,
        ctaUrl: 'https://whylabs.ai/blog/posts/data-quality-monitoring-for-kafka-beyond-schema-validation',
        description: 'Monitor and log data in motion so your organization can innovate in the digital-first world.',
      },
      {
        title: 'On Premise',
        logo: onPremiseLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/integrations-cloud#on-premises',
        description:
          'Plug whylogs open source telemetry agent to your custom infrastructure. For containerized architecture, use our container as a sidecar. We’ve got you covered!',
      },
    ],
    id: 1,
  },
  {
    title: 'Data Sources',
    cards: [
      {
        title: 'Apache Spark',
        logo: sparkLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/spark-integration',
        description: 'Distributed big data? We are not afraid of scale!',
      },
      {
        title: 'Apache Kafka',
        logo: kafkaLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/kafka-integration',
        description: 'Streamed data is streaming data bug - let’s monitor it!',
      },
      {
        title: 'Ray',
        logo: rayLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/ray-integration',
        description: 'Distributed applications get distributed monitoring...',
      },
      {
        title: 'Teradata',
        logo: teradataLogo,
        ctaUrl: 'https://whylabs.ai/contact-us',
        alternativeCTAText: 'Contact Us',
        description: 'Data driven since 1979. We make sure this data is high quality!',
      },
      {
        title: 'Python Pandas',
        logo: pandasLogo,
        ctaUrl: 'https://github.com/whylabs/whylogs/blob/mainline/python/examples/basic/Getting_Started.ipynb',
        description: 'Works with Pandas dataframe out of the box!',
      },
      {
        title: 'Dask',
        logo: daskLogo,
        ctaUrl: 'https://whylogs.readthedocs.io/en/latest/examples/integrations/Dask_Profiling.html',
        description: 'Python apps of crazy scale should be monitored too, we are on it.',
      },
      {
        title: 'Snowflake',
        logo: snowflakeLogo,
        description: 'Coming to the Data Cloud near you soon!',
        comingSoon: true,
      },
      {
        title: 'Modin',
        logo: modinLogo,
        description: 'Those 1TB DataFrames are about to become high quality.',
        comingSoon: true,
      },
    ],
    id: 2,
  },
  {
    title: 'Data and ML Pipelines',
    cards: [
      {
        title: 'Flyte / Union AI',
        logo: flyteLogo,
        ctaUrl:
          'https://docs.flyte.org/projects/cookbook/en/stable/auto/integrations/flytekit_plugins/whylogs_examples/index.html',
        description:
          'Include monitoring in your production-grade orchestration for machine learning workflows and data processing.',
      },
      {
        title: 'ZenML',
        logo: zenMlLogo,
        ctaUrl: 'https://docs.zenml.io/component-gallery/data-validators/whylogs',
        description:
          'Open-source data logging meets the open-source MLOps framework for creating portable, production-ready pipelines.',
      },
      {
        title: 'Airflow',
        logo: airflowLogo,
        ctaUrl: 'https://whylabs.ai/blog/posts/data-quality-monitoring-in-apache-airflow-with-whylogs',
        description: 'Use whylogs with your Airflow plug-and-play operators to execute your ML monitoring tasks.',
      },
      {
        title: 'Kedro',
        logo: kedroLogo,
        description: 'Add monitoring to create even more robust and scalable data pipelines built with Kedro.',
        comingSoon: true,
      },
      {
        title: 'Prefect',
        logo: prefectLogo,
        description: 'Use Prefect with whylogs for data logging and monitoring.',
        comingSoon: true,
      },
      {
        title: 'Dagster',
        logo: dagsterLogo,
        description: 'Use WhyLabs with Dagster to develop and maintain assets.',
        comingSoon: true,
      },
    ],
    id: 3,
  },
  {
    title: 'Deployment Managers',
    cards: [
      {
        title: 'Amazon SageMaker',
        logo: sageMakerLogo,
        ctaUrl: 'https://aws.amazon.com/blogs/startups/preventing-amazon-sagemaker-model-degradation-with-whylabs/',
        description:
          'MLOps platform built to work with AWS infrastructure now with fully integrated WhyLabs monitoring!',
      },
      {
        title: 'UbiOps',
        logo: ubiOpsLogo,
        ctaUrl: 'https://whylabs.ai/blog/posts/ubiops-whylabs',
        description: 'Streamed data is streaming data bug - let’s monitor it!',
      },
      {
        title: 'Valohai',
        logo: valohaiLogo,
        ctaUrl:
          'https://whylabs.ai/blog/posts/observability-in-production-monitoring-data-drift-with-whylabs-and-valohai',
        description: 'MLOps platform focused on automation gets automatic monitoring.',
      },
      {
        title: 'Predibase',
        logo: predibaseLogo,
        ctaUrl: 'https://whylabs.ai/contact-us',
        alternativeCTAText: 'Contact Us',
        description: 'High performance, low code ML meets high performance, low code monitoring.',
      },
      {
        title: 'TeachableHub',
        logo: teachableHubLogo,
        ctaUrl: 'https://whylabs.ai/blog/posts/deploying-and-monitoring-made-easy-with-teachablehub-and-whylabs',
        description: 'Self-serve monitoring for self-serve deployment with zero MLOps platform.',
      },
      {
        title: 'Vertex AI',
        logo: vertexHubLogo,
        ctaUrl: 'https://whylabs.ai/contact-us',
        alternativeCTAText: 'Contact Us',
        description: 'If you build, deploy, and scale machine learning models on Vertex, you can monitor them too!',
      },
      {
        title: 'Azure ML',
        logo: azureMLLogo,
        ctaUrl: 'https://whylabs.ai/contact-us',
        alternativeCTAText: 'Contact Us',
        description: 'Monitor your machine learning solutions built Azure ML for even more confidence.',
      },
      {
        title: 'NimbleBox',
        logo: nimbleboxLogo,
        description: 'Run fast, deploy often, and don’t forget to monitor.',
        comingSoon: true,
      },
    ],
    id: 4,
  },
  {
    title: 'Feature Stores',
    cards: [
      {
        title: 'Feast',
        logo: feastLogo,
        ctaUrl: 'https://whylogs.readthedocs.io/en/latest/examples/integrations/Feature_Stores_and_whylogs.html',
        description: 'Automate and monitor your production ML data pipelines with Feast and WhyLabs.',
      },
      {
        title: 'Tecton',
        logo: tectonLogo,
        ctaUrl: 'https://whylabs.ai/contact-us',
        alternativeCTAText: 'Contact Us',
        description: 'Feature platform for real-time machine learning meets platform for real-time monitoring.',
      },
      {
        title: 'FeatureForm',
        logo: featureFormLogo,
        ctaUrl: 'https://whylabs.ai/contact-us',
        alternativeCTAText: 'Contact Us',
        description: 'We’ll provide the monitoring while Featureform provides the feature store.',
      },
      {
        title: 'Hopsworks',
        logo: hopsworksLogo,
        description: 'Development and monitor machine learning models at scale with Hopsworks and WhyLabs.',
        comingSoon: true,
      },
    ],
    id: 5,
  },
  {
    title: 'Data Version Control',
    cards: [
      {
        title: 'Pachyderm',
        logo: pachydermLogo,
        description: 'Automate and monitor complex data engineering pipelines.',
        comingSoon: true,
      },
      {
        title: 'DVC',
        logo: dvcLogo,
        description: 'Use data logging and version control systems for data science and machine learning projects.',
        comingSoon: true,
      },
    ],
    id: 6,
  },
  {
    title: 'Data Labeling Platforms',
    cards: [
      {
        title: 'Superb AI',
        logo: superbAiLogo,
        ctaUrl: 'https://whylabs.ai/blog/posts/data-labeling-meets-data-monitoring-with-superb-ai-and-whylabs',
        description: 'Data labeling meets data monitoring!',
      },
      {
        title: 'Toloka',
        logo: tolokaLogo,
        ctaUrl: 'https://whylabs.ai/contact-us',
        alternativeCTAText: 'Contact Us',
        description:
          'Crowd-sourced data collection and annotation can integrate with ML monitoring in WhyLabs to fix issues such as data drift.',
      },
      {
        title: 'Snorkel',
        logo: snorkelLogo,
        description: 'If data labeling is automated, data quality should be too!',
        comingSoon: true,
      },
    ],
    id: 7,
  },
  {
    title: 'Experiment Trackers',
    cards: [
      {
        title: 'MLflow',
        logo: mlFlowLogo,
        ctaUrl: 'https://whylabs.ai/blog/posts/on-model-lifecycle-and-monitoring',
        description: 'The open-source experiment tracker has a deployment tool!',
      },
      {
        title: 'Weights & Biases',
        logo: weightsAndBiasesLogo,
        description: 'Track ML experiments, dataset versions, and monitor models in production!',
        comingSoon: true,
      },
      {
        title: 'Neptune AI',
        logo: neptuneAILogo,
        description: 'Add monitoring to your metadata store for MLOps with WhyLabs and Neptune.',
        comingSoon: true,
      },
    ],
    id: 8,
  },
  {
    title: 'Serving Architectures',
    cards: [
      {
        title: 'Ray Serve / Anyscale',
        logo: anyscaleLogo,
        ctaUrl: 'https://www.anyscale.com/blog/running-and-monitoring-distributed-ml-with-ray-and-whylogs',
        description: 'Monitoring for your cutting-edge distributed serving',
      },
      {
        title: 'BentoML',
        logo: bentoMLLogo,
        ctaUrl: 'https://github.com/whylabs/whylogs/tree/mainline/python/examples/integrations/bentoml',
        description: 'The lightest-weight serving architecture that we know of!',
      },
      {
        title: 'FastAPI',
        logo: fastAPILogo,
        ctaUrl: 'https://github.com/whylabs/whylogs/tree/mainline/python/examples/integrations/fastapi',
        description: 'Now you can monitor your models deployed as RESTful API endpoints',
      },
      {
        title: 'Flask',
        logo: flaskLogo,
        ctaUrl: 'https://whylabs.ai/blog/posts/deploy-and-monitor-your-ml-application-with-flask-and-whylabs',
        description: 'Models deployed as web services need monitoring too',
      },
      {
        title: 'Seldon',
        logo: seldonLogo,
        description: 'Integrate with Seldon to deploy, monitor and explain machine learning models.',
        comingSoon: true,
      },
    ],
    id: 9,
  },
  {
    title: 'Notifications',
    cards: [
      {
        title: 'Slack',
        logo: slackLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/whylabs-notifications/',
        description: 'Get notifications pushed to your team’s favorite chat app',
      },
      {
        title: 'Email',
        logo: emailLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/whylabs-notifications/',
        description: 'Receive email notifications whenever an alert gets created',
      },
      {
        title: 'PagerDuty',
        logo: pagerDutyLogo,
        ctaUrl: 'https://docs.whylabs.ai/docs/whylabs-notifications/',
        description: 'Get notifications for critical-path MLOps incident response',
      },
      {
        title: 'ServiceNow',
        logo: serviceNowLogo,
        description: 'Resolve issues with ML models faster by integrating monitoring into your automated workflows.',
        comingSoon: true,
      },
    ],
    id: 10,
  },
];
