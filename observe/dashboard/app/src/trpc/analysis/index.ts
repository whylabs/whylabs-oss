import { router } from '../trpc';
import { analyzerResults } from './analyzer';

const analysis = router({
  analyzerResults: analyzerResults,
});

export default analysis;
