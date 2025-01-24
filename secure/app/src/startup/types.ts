import { Express } from 'express';
import pino from 'pino';

export interface DashboardStartupOptions {
  port: number | string;
  serviceUrl: string;
}

export type DashboardStartupFunc<T> = (
  app: Express,
  logger: pino.Logger,
  options: DashboardStartupOptions,
) => Promise<T>;
