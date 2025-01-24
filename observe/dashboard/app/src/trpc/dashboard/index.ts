import { router } from '../trpc';
import { columns } from './columns';
import { constraints } from './constraints';
import { customDashboard } from './custom';
import { evaluation } from './evaluation';
import { events } from './events';
import { insights } from './insights';
import { metrics } from './metrics';

const meta = router({
  custom: customDashboard,
  columns,
  constraints,
  events,
  metrics,
  insights,
  evaluation,
});

export default meta;
