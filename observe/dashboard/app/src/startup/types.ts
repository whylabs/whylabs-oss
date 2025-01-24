import { Express } from 'express';
import pino from 'pino';

export interface DashboardStartupOptions {
  port: number | string;
  serviceUrl: string;
  frontEndUrl: string;
  serveFrontEnd: boolean;
}

export type DashboardStartupFunc<T> = (
  app: Express,
  logger: pino.Logger,
  options: DashboardStartupOptions,
) => Promise<T>;
