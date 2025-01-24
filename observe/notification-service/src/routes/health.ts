import { Handler } from 'express';

import { config } from '../config';
export enum ServerStatus {
  Init = 'initializing',
  Starting = 'starting',
  Ready = 'ready',
  Stopping = 'stopping',
  Error = 'error',
}

let serverStatus = ServerStatus.Init;

export const setStatus = (status: ServerStatus): void => {
  serverStatus = status;
};

export const getStatus = (): ServerStatus => {
  return serverStatus;
};

export const status: Handler = async (req, res): Promise<void> => {
  res
    .status(serverStatus in [ServerStatus.Starting, ServerStatus.Ready] ? 200 : 503)
    .send({ serverStatus, commit: config.latestCommit });
};

export const ready: Handler = async (req, res): Promise<void> => {
  res.status(serverStatus === ServerStatus.Ready ? 200 : 503).send({ serverStatus, commit: config.latestCommit });
};
