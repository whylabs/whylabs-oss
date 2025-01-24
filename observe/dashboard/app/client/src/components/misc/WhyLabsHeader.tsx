import { Divider, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ReactElement, ReactNode } from 'react';

import {
  WhyLabsInputNumberProps,
  WhyLabsNumberInput,
  WhyLabsSelect,
  WhyLabsSelectProps,
  WhyLabsTooltip,
} from '../design-system';

export const useHeaderStyles = createStyles({
  header: {
    backgroundColor: Colors.white,
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    padding: '16px',
    overflowX: 'auto',
    flexShrink: 0,
    borderBottom: `1px solid ${Colors.secondaryLight200}`,
  },
  separator: {
    backgroundColor: Colors.brandSecondary200,
    margin: 0,
    marginTop: '12px',
    marginBottom: '6px',
    width: 1,
  },
  headerSection: {
    display: 'flex',
    gap: 16,
  },
  headerControl: {},
});

type InputDefault = {
  width?: string | number;
  key: string;
  inputTooltip?: string;
};

type SelectHeaderInput = {
  kind: 'select';
  props: WhyLabsSelectProps;
};

type NumberHeaderInput = {
  kind: 'numberInput';
  props: WhyLabsInputNumberProps;
};

export type WhyLabsHeaderInput = (SelectHeaderInput | NumberHeaderInput) & InputDefault;

type GenericSection = {
  label: string;
  dividerAfter?: boolean;
};

type InputSection = {
  inputs: WhyLabsHeaderInput[];
} & GenericSection;

type ElementSection = {
  element: ReactNode;
} & GenericSection;
export type WhyLabsHeaderSection = InputSection | ElementSection;
type WhyLabsHeaderProps = {
  sections: WhyLabsHeaderSection[];
};

export const WhyLabsHeader = ({ sections }: WhyLabsHeaderProps): ReactElement => {
  const headerStyles = useHeaderStyles().classes;
  const headerInputToJSX = (input: WhyLabsHeaderInput): JSX.Element => {
    switch (input.kind) {
      case 'select':
        return <WhyLabsSelect {...input.props} key={`${input.key}--select`} />;
      case 'numberInput': {
        const { loading, placeholder, precision } = input.props;
        return (
          <WhyLabsNumberInput
            {...input.props}
            key={`${input.key}--number-input`}
            placeholder={loading ? 'Loading... ' : placeholder}
            precision={precision || 6}
          />
        );
      }
      default:
        return <></>;
    }
  };

  const renderHeader = (input: WhyLabsHeaderInput): JSX.Element => {
    return (
      <div key={input.key} style={{ width: input.width }}>
        <WhyLabsTooltip label={input.inputTooltip ?? ''}>{headerInputToJSX(input)}</WhyLabsTooltip>
      </div>
    );
  };

  const renderSection = (section: WhyLabsHeaderSection, index: number): JSX.Element => {
    const lastSection = index === sections.length - 1;
    return (
      <div key={section.label} className={headerStyles.headerSection} style={{ flexGrow: lastSection ? 1 : 'unset' }}>
        {'inputs' in section && section.inputs.map(renderHeader)}
        {'element' in section && section.element}
        {section.dividerAfter && !lastSection && <Divider className={headerStyles.separator} />}
      </div>
    );
  };
  return <div className={headerStyles.header}>{sections.map(renderSection)}</div>;
};
