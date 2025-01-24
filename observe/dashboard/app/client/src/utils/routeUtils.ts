import { LoaderFunctionArgs, Await as RrdAwait, defer, useLoaderData } from 'react-router-dom';

export type DataTypeFromLoader<TLoader extends ReturnType<typeof deferredLoader>> = ReturnType<TLoader>['data'];

export function useTypeSafeLoaderData<TLoader extends ReturnType<typeof deferredLoader>>() {
  return useLoaderData() as DataTypeFromLoader<TLoader>;
}

export function deferredLoader<TData extends Record<string, unknown>>(dataFunc: (args: LoaderFunctionArgs) => TData) {
  return (args: LoaderFunctionArgs) =>
    defer(dataFunc(args)) as Omit<ReturnType<typeof defer>, 'data'> & { data: TData };
}

export interface AwaitResolveRenderFunction<T> {
  (data: Awaited<T>): React.ReactElement;
}

export interface AwaitProps<T> {
  children: React.ReactNode | AwaitResolveRenderFunction<T>;
  errorElement?: React.ReactNode;
  resolve: Promise<T>;
}

export function AwaitTypeSafe<T>(props: AwaitProps<T>): JSX.Element {
  return RrdAwait(props);
}
