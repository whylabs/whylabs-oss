import { router } from '../trpc';
import { organizations } from './organizations';

const admin = router({
  organizations: organizations,
});

export default admin;
