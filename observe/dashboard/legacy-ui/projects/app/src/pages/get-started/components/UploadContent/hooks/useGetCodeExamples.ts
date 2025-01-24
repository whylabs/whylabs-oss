import flaskIcon from 'ui/flask-dark.svg';
import pythonIcon from 'ui/python.svg';
import sagemakerIcon from 'ui/sagemaker.svg';
import basicIcon from 'ui/basic-language-icon.svg';
import { Language } from 'components/whylabs-code-block/WhyLabsCodeBlock';
import { PythonExamples } from '../codeExamples';

interface GetCodeExamplesProps {
  orgId?: string;
  modelId?: string;
  accessToken?: string;
  modelName?: string;
}

enum SubTabIds {
  None = 'None',
  Flask = 'Flask',
  SageMaker = 'SageMaker',
  Spark = 'Spark',
  MLFlow = 'MLFlow',
}

interface SubTab {
  code: string;
  image: string;
  label: string;
  id: SubTabIds; // Used for more reliable typing
}

export interface ITab {
  label: string;
  image: string;
  language: Language;
  children: SubTab[];
}

export function useGetCodeExamples({ modelId, orgId, accessToken, modelName }: GetCodeExamplesProps): ITab[] {
  const tabs: ITab[] = [
    {
      label: 'Python',
      language: 'python',
      image: pythonIcon,
      children: [
        {
          label: 'Basic',
          code: PythonExamples.none(modelId, orgId, accessToken, modelName),
          image: basicIcon,
          id: SubTabIds.None,
        },
        {
          label: 'Flask',
          code: PythonExamples.flask(),
          image: flaskIcon,
          id: SubTabIds.Flask,
        },
        {
          label: 'SageMaker',
          code: PythonExamples.sagemaker,
          image: sagemakerIcon,
          id: SubTabIds.SageMaker,
        },
      ],
    },
  ];

  return tabs;
}
