import { Navbar, createStyles } from '@mantine/core';
import { WhyLabsButton } from '~/components/design-system';
import { UnfinishedFeatureFlag } from '~/components/misc/UnfinishedFeatureFlag';
import { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';

import * as ComponentsPlaygroundList from './playgrounds';

/*
    Follow this instruction to add new component playground:
    1. Create a new file in /playgrounds folder with the name of the component you want to create a playground for.
    2. Export the component in /playgrounds/index.ts file.
*/

const ComponentsKeysList = Object.keys(ComponentsPlaygroundList);

const SELECTED_KEY = 'display';
const useStyles = createStyles({
  root: {
    display: 'flex',
    width: '100%',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: '100%',
    padding: 16,
    minHeight: '100%',
  },
});
export const PlaygroundIndex = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes } = useStyles();
  const selected = searchParams.get(SELECTED_KEY) ?? ComponentsKeysList[0];

  // @ts-expect-error - the index.ts file in this folder exports all the Playground components
  const SelectedComponent: JSX.Element = ComponentsPlaygroundList[selected];

  return (
    <UnfinishedFeatureFlag>
      <div className={classes.root}>
        <Navbar width={{ base: 200 }} p="xs" sx={{ display: 'flex', gap: 6, zIndex: 'initial' }}>
          {ComponentsKeysList.map(renderMenuItem)}
        </Navbar>
        <div className={classes.content}>
          {/* @ts-expect-error - TS doesn't understand the hacky way we are importing the component */}
          <SelectedComponent />
        </div>
      </div>
    </UnfinishedFeatureFlag>
  );

  function renderMenuItem(item: string) {
    const isSelected = item === selected;
    return (
      <WhyLabsButton key={item} onClick={onSelect(item)} variant={isSelected ? 'filled' : 'outline'} width="full">
        {item.replace('Playground', '')}
      </WhyLabsButton>
    );
  }

  function onSelect(item: string) {
    return () => {
      setSearchParams({ [SELECTED_KEY]: item });
    };
  }
};
