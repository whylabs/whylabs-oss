import { Router } from 'express';

import health from './health';

export default (): Router => {
  const router = Router();

  router.get('/', health());

  return router;
};
