import { CallOptions, WhyLabsCallContext } from '../../util/async-helpers';
import { OperationContext } from '../../util/misc';
import { TrpcContext } from '../trpc';

const whylabsContextFromTrpcContext = (cxt: TrpcContext, opCxt: OperationContext = {}): WhyLabsCallContext => {
  return {
    whylabsUserId: cxt.userMetadata?.userId,
    auth0UserId: cxt.auth0UserId ?? 'unknown',
    auditOrigIp: cxt.auditOrigIp,
    operationContext: { ...opCxt },
  };
};

export const callOptionsFromTrpcContext = (cxt: TrpcContext, opCxt: OperationContext = {}): CallOptions => {
  return {
    context: whylabsContextFromTrpcContext(cxt, opCxt),
  };
};
