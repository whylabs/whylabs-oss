import { Handler } from 'express';

import { latestCommit } from '../../config';

export default (): Handler =>
  async (req, res): Promise<void> => {
    res.status(200).send(latestCommit);
  };
