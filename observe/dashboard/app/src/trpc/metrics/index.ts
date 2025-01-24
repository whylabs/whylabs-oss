import { router } from '../trpc';
import simple from './simple';

const metrics = router({
  simple,
});

export default metrics;
