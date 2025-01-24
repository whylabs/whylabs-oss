import { WhyLabsCard } from '~/components/design-system';
import { ObservationTree } from '~/components/ObservationTree/ObservationTree';
import { NestedObservationTreeItem } from '~/components/ObservationTree/types';
import { SELECTED_QUERY_NAME } from '~/utils/searchParamsConstants';
import { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';

export const ObservationTreePlayground = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get(SELECTED_QUERY_NAME);

  const observations: NestedObservationTreeItem[] = [
    {
      id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7',
      title: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7',
      children: [
        {
          id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-1',
          title: 'user-interaction',
          children: [
            {
              id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-1-1',
              title: 'retrieval',
              children: [
                {
                  id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-1-1-1',
                  title: 'prompt-embedding',
                },
                {
                  id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-1-1-2',
                  title: 'vector-store',
                },
                {
                  id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-1-1-3',
                  title: 'context-encoding',
                },
              ],
            },
            {
              id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-1-2',
              title: 'completion',
            },
          ],
        },
        {
          id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-2',
          title: 'user-interaction',
          children: [
            {
              id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-2-1',
              title: 'retrieval',
              children: [
                {
                  id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-2-1-1',
                  title: 'prompt-embedding',
                },
                {
                  id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-2-1-2',
                  title: 'vector-store',
                },
                {
                  id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7-2-1-3',
                  title: 'context-encoding',
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  return (
    <WhyLabsCard>
      <ObservationTree observations={observations} onChange={onSelectObservation} selectedId={selectedId} />
    </WhyLabsCard>
  );

  function onSelectObservation(id: string) {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.set(SELECTED_QUERY_NAME, id);
      return nextSearchParams;
    });
  }
};
