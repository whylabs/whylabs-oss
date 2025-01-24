import { arrayOfLength } from 'utils/arrayUtils';
import { Skeleton, SkeletonProps } from '@mantine/core';

type SkeletonGroupProps = {
  count: number;
} & SkeletonProps;
export const SkeletonGroup = ({ count, ...rest }: SkeletonGroupProps): JSX.Element => {
  return (
    <>
      {arrayOfLength(count).map((n) => (
        <Skeleton key={n} {...rest} />
      ))}
    </>
  );
};
