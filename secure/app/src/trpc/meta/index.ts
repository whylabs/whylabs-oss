import { router } from '../trpc';
import { llmTrace } from './llm-trace/llm-trace';
import { llmTracePolicy } from './llm-trace/policy';
import { llmTraceSummary } from './llm-trace/summary';
import resources from './resources';

const meta = router({
  resources,
  llmTrace,
  llmTracePolicy,
  llmTraceSummary,
});

export default meta;
