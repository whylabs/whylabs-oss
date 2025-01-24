import { Skeleton, SkeletonProps } from '@mantine/core';
import { arrayOfLength } from '~/utils/arrayUtils';

type SkeletonGroupProps = {
  count: number;
} & SkeletonProps;
export const SkeletonGroup = ({ count, ...rest }: SkeletonGroupProps) => {
  return (
    <>
      {arrayOfLength(count).map((n) => (
        <Skeleton key={n} {...rest} />
      ))}
    </>
  );
};
