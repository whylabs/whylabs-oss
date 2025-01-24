import { GetUserQuery } from 'generated/graphql';

export type CurrentUser = GetUserQuery['user'] | null | undefined;
