import { PoliciesJsonSchema } from '../../../../schemas/generated/llm-policies-schema';

export const uiPoliciesSchema: PoliciesJsonSchema = {
  policies: [
    {
      id: 'bad-actors',
      title: 'Bad Actors',
      type: 'prompt',
      icon: 'skull',
      description: 'Detection of malicious actors or malicious usage.',
      latencyMilliseconds: 91,
      config: [
        {
          type: 'segmented-control',
          id: 'behavior',
          title: 'Behavior',
          tooltip: 'todo behavior tooltip',
          description: '{s} prompts that include malicious actors or that indicate malicious usage',
          options: [
            { label: 'Observe', value: 'observe', icon: 'telescope', color: 'blue' },
            { label: 'Flag', value: 'flag', icon: 'flag', color: 'orange' },
            { label: 'Block', value: 'block', icon: 'hand-three-fingers', color: 'red' },
          ],
        },
        {
          type: 'segmented-control',
          id: 'sensitivity',
          title: 'Sensitivity',
          tooltip: 'todo sensitivity tooltip',
          description: 'Will take action with {s} sensitivity to detect bad actors',
          options: [
            { label: 'Low', value: 'low', color: 'blue' },
            { label: 'Medium', value: 'medium', color: 'orange' },
            { label: 'High', value: 'high', color: 'red' },
          ],
        },
      ],
    },
    {
      id: 'misuse',
      title: 'Misuse',
      type: 'prompt-and-response',
      icon: 'tank',
      description: 'Detection of non-compliant or poor usage.',
      latencyMilliseconds: 104,
      config: [
        {
          type: 'segmented-control',
          id: 'behavior',
          title: 'Behavior',
          tooltip: 'todo behavior tooltip',
          description:
            '{s} prompts or responses that include non-compliant or sensitive topics, or that suggest poor usage',
          options: [
            { label: 'Observe', value: 'observe', icon: 'telescope', color: 'blue' },
            { label: 'Flag', value: 'flag', icon: 'flag', color: 'orange' },
            { label: 'Block', value: 'block', icon: 'hand-three-fingers', color: 'red' },
          ],
        },
        {
          type: 'segmented-control',
          id: 'sensitivity',
          title: 'Sensitivity',
          tooltip: 'todo sensitivity tooltip',
          description: 'Will take action with {s} sensitivity to detect misuse',
          options: [
            { label: 'Low', value: 'low', color: 'blue' },
            { label: 'Medium', value: 'medium', color: 'orange' },
            { label: 'High', value: 'high', color: 'red' },
          ],
        },
        {
          type: 'checkbox-group',
          id: 'topics',
          title: 'Topics',
          tooltip: 'todo topics tooltip',
          description:
            "When selected, the topics will be governed by this ruleset's behavior. If no topics are selected, a general misuse check is performed.",
          options: [
            {
              label: 'Financial topics',
              value: 'financial',
            },
            {
              label: 'Legal topics',
              value: 'legal',
            },
            {
              label: 'Medical topics',
              value: 'medical',
            },
            {
              label: 'Code topics',
              value: 'code',
            },
          ],
        },
      ],
    },
    {
      id: 'cost',
      title: 'Cost',
      type: 'prompt-and-response',
      icon: 'message-dollar',
      description:
        'Detection of text stat outliers that correlate to cost. Text stats include token count, character count, and word count.',
      latencyMilliseconds: 0.002,
      config: [
        {
          type: 'segmented-control',
          id: 'behavior',
          title: 'Behavior',
          tooltip: 'todo behavior tooltip',
          description: '{s} text stat outliers that correlate to changes in cost',
          options: [
            { label: 'Observe', value: 'observe', icon: 'telescope', color: 'blue' },
            { label: 'Flag', value: 'flag', icon: 'flag', color: 'orange' },
            { label: 'Block', value: 'block', icon: 'hand-three-fingers', color: 'red' },
          ],
        },
        {
          type: 'segmented-control',
          id: 'sensitivity',
          title: 'Sensitivity',
          tooltip: 'todo sensitivity tooltip',
          description: 'Will take action with {s} sensitivity to detect text stat outliers',
          options: [
            { label: 'Low', value: 'low', color: 'blue' },
            { label: 'Medium', value: 'medium', color: 'orange' },
            { label: 'High', value: 'high', color: 'red' },
          ],
        },
      ],
    },
    {
      id: 'customer-experience',
      title: 'Customer Experience',
      type: 'prompt-and-response',
      icon: 'user-heart',
      description: 'Detection of poor customer experience.',
      latencyMilliseconds: 183,
      config: [
        {
          type: 'segmented-control',
          id: 'behavior',
          title: 'Behavior',
          tooltip: 'todo behavior tooltip',
          description: '{s} interactions that indicate the user had a poor customer experience with the AI application',
          options: [
            { label: 'Observe', value: 'observe', icon: 'telescope', color: 'blue' },
            { label: 'Flag', value: 'flag', icon: 'flag', color: 'orange' },
            { label: 'Block', value: 'block', icon: 'hand-three-fingers', color: 'red' },
          ],
        },
        {
          type: 'segmented-control',
          id: 'sensitivity',
          title: 'Sensitivity',
          tooltip: 'todo sensitivity tooltip',
          description: 'Will take action with {s} sensitivity to detect  poor customer experience',
          options: [
            { label: 'Low', value: 'low', color: 'blue' },
            { label: 'Medium', value: 'medium', color: 'orange' },
            { label: 'High', value: 'high', color: 'red' },
          ],
        },
        {
          type: 'checkbox-group',
          id: 'user-feedback',
          title: 'User feedback',
          tooltip: 'todo user feedback tooltip',
          description:
            'When selected, any user feedback collected by the AI application–such as a thumbs down–will be included.',
          options: [{ label: 'Take user interactions into account', value: 'interactions' }],
        },
      ],
    },
    {
      id: 'truthfulness',
      title: 'Truthfulness',
      type: 'response',
      icon: 'target-arrow',
      description: 'Detection of hallucinations, errors, and ambiguous responses that can result in overreliance.',
      config: [
        {
          type: 'segmented-control',
          id: 'behavior',
          title: 'Behavior',
          tooltip: 'todo behavior tooltip',
          description: '{s} responses that indicate the presence of hallucinations, errors, and ambiguity',
          options: [
            { label: 'Observe', value: 'observe', icon: 'telescope', color: 'blue' },
            { label: 'Flag', value: 'flag', icon: 'flag', color: 'orange' },
            { label: 'Block', value: 'block', icon: 'hand-three-fingers', color: 'red' },
          ],
        },
        {
          type: 'segmented-control',
          id: 'sensitivity',
          title: 'Sensitivity',
          tooltip: 'todo sensitivity tooltip',
          description:
            'Will take action with {s} sensitivity to detect hallucinations, errors, and ambiguous responses',
          options: [
            { label: 'Low', value: 'low', color: 'blue' },
            { label: 'Medium', value: 'medium', color: 'orange' },
            { label: 'High', value: 'high', color: 'red' },
          ],
        },
        {
          type: 'checkbox-group',
          id: 'validation-method',
          title: 'Validation method',
          tooltip: 'TODO Validation method tooltip',
          description: 'When selected, an additional validation method will be used to help determine truthfulness.',
          options: [
            { label: 'Validate against a context (RAG)', value: 'rag-context', tooltip: 'TODO RAG tooltip' },
            { label: 'Validate with LLM as a judge', value: 'llm-judge', tooltip: 'TODO LLM as a judge tooltip' },
          ],
        },
      ],
    },
  ],
  configSelections: {
    policies: [
      {
        id: 'bad-actors',
        enabled: false,
        params: [
          { id: 'behavior', type: 'segmented-control', value: 'flag' },
          { id: 'sensitivity', type: 'segmented-control', value: 'medium' },
        ],
      },
      {
        id: 'misuse',
        enabled: false,
        params: [
          { id: 'behavior', type: 'segmented-control', value: 'flag' },
          { id: 'sensitivity', type: 'segmented-control', value: 'medium' },
          { id: 'topics', type: 'checkbox-group', value: [] },
        ],
      },
      {
        id: 'cost',
        enabled: false,
        params: [
          { id: 'behavior', type: 'segmented-control', value: 'flag' },
          { id: 'sensitivity', type: 'segmented-control', value: 'medium' },
        ],
      },
      {
        id: 'customer-experience',
        enabled: false,
        params: [
          { id: 'behavior', type: 'segmented-control', value: 'flag' },
          { id: 'sensitivity', type: 'segmented-control', value: 'medium' },
          { id: 'user-feedback', type: 'checkbox-group', value: [] },
        ],
      },
      {
        id: 'truthfulness',
        enabled: false,
        params: [
          { id: 'behavior', type: 'segmented-control', value: 'flag' },
          { id: 'sensitivity', type: 'segmented-control', value: 'medium' },
          { id: 'validation-method', type: 'checkbox-group', value: [] },
        ],
      },
    ],
  },
};
