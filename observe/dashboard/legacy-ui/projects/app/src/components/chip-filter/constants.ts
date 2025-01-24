import { ICheckboxCategory } from './ChipFilter';

export const FILTER_CHECKBOXES_INFERED: ICheckboxCategory[] = [
  {
    category: 'Infered values',
    list: [
      {
        onChange: (): void => {
          /**/
        },
        selected: true,
        value: 'discrete',
        text: 'Inferred discrete',
      },
      {
        onChange: (): void => {
          /**/
        },
        selected: true,
        value: 'non-discrete',
        text: 'Inferred non-discrete',
      },
    ],
  },
];
