import { AppShell, createStyles } from '@mantine/core';
import { ReactNode } from 'react';
import { Colors } from '~/assets/Colors';
import WhyLabsTitle from '~/components/design-system/typography/WhyLabsTitle';
import { WhyLabsSuperDatePickerProps } from '~/components/super-date-picker/utils';
import { WhyLabsSuperDatePicker } from '~/components/super-date-picker/WhyLabsSuperDatePicker';
import { TimePeriod } from '~server/types/api';

import { BetaBadge } from '../beta/BetaBadge';
import { WhyLabsSelect, WhyLabsSelectProps } from '../design-system';
import { SinglePageHeader } from './SinglePageHeader';

type StyleProps = {
  hideHeader?: boolean;
};

const useStyles = createStyles((_, { hideHeader }: StyleProps) => ({
  body: {
    height: '100%',
    overflowY: 'auto',
  },
  root: {
    background: Colors.brandSecondary100,
    display: 'grid',
    gridTemplateRows: hideHeader ? '1fr' : 'auto 1fr',
    padding: 0,
    height: '100dvh',
  },
  main: {
    display: 'grid',
    height: '100%',
    minHeight: 'inherit',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerSelectorsRoot: {
    display: 'flex',
    flexDirection: 'row',
    gap: 5,

    '& > *': {
      width: 260,
    },
  },
  headerChildrenContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
  },
  pageTitle: {
    color: Colors.secondaryLight100,
    fontSize: 14,
    lineHeight: 1.71,
    fontWeight: 400,
    margin: 0,
    whiteSpace: 'nowrap',
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  rightAlignedTitle: {
    display: 'flex',
    paddingRight: 8,
    gap: 7,
    alignItems: 'center',
  },
}));

type HeaderSelectorsProps = Pick<
  WhyLabsSelectProps,
  'className' | 'clearable' | 'data' | 'itemComponent' | 'label' | 'loading' | 'onChange' | 'value'
>;

export type HeaderField = {
  type: 'select';
} & HeaderSelectorsProps;

type NonCustomizableDatePickerProps = Pick<
  WhyLabsSuperDatePickerProps,
  'presetSizeSearchParamKey' | 'startDateSearchParamKey' | 'endDateSearchParamKey' | 'withinPortal'
>;

type SinglePageLayoutProps = StyleProps & {
  classNames?: {
    root?: string;
    main?: string;
  };
  children: ReactNode;
  displayBetaBadge?: boolean;
  datePickerConfig?: { visible: boolean } & Partial<
    Omit<WhyLabsSuperDatePickerProps, keyof NonCustomizableDatePickerProps>
  >;
  headerFields?: HeaderField[];
  pageTitle?: string;
};

const defaultGlobalPickerProps: WhyLabsSuperDatePickerProps = {
  label: 'Global date range:',
  hideLabel: true,
  timePeriod: TimePeriod.P1D,
  variant: 'dark',
  withinPortal: true,
  presetsListPosition: 'end',
};

export const SinglePageLayout = ({
  children,
  classNames,
  displayBetaBadge,
  datePickerConfig,
  headerFields,
  pageTitle,
  hideHeader,
}: SinglePageLayoutProps): JSX.Element => {
  const { classes, cx } = useStyles({ hideHeader });
  const { visible: isDatePickerVisible, ...customGlobalPickerProps } = datePickerConfig ?? {};

  const titleSection = (
    <>
      {pageTitle && (
        <WhyLabsTitle element="h1" className={classes.pageTitle}>
          {pageTitle}
        </WhyLabsTitle>
      )}
      {displayBetaBadge && <BetaBadge />}
    </>
  );

  const titleOnRightSection = displayBetaBadge && !!pageTitle;

  const renderHeader = () => {
    if (hideHeader) return <></>;

    return (
      <div>
        <SinglePageHeader>
          <div className={classes.header}>
            <div className={classes.headerChildrenContainer}>
              {!!headerFields?.length && (
                <div className={classes.headerSelectorsRoot}>{headerFields.map(renderField)}</div>
              )}
              {titleOnRightSection ? null : titleSection}
            </div>
            <div className={classes.rightControls}>
              {titleOnRightSection ? <div className={classes.rightAlignedTitle}>{titleSection}</div> : null}
              {!!isDatePickerVisible && (
                <WhyLabsSuperDatePicker {...defaultGlobalPickerProps} {...customGlobalPickerProps} />
              )}
            </div>
          </div>
        </SinglePageHeader>
      </div>
    );
  };

  return (
    <AppShell
      classNames={{
        body: classes.body,
        root: cx(classes.root, classNames?.root),
        main: cx(classes.main, classNames?.main),
      }}
      header={renderHeader()}
      padding={0}
    >
      {children}
    </AppShell>
  );

  function renderField({ type, ...props }: HeaderField) {
    if (type === 'select') return renderSelectField(props);

    return null;
  }

  function renderSelectField({ clearable = false, ...rest }: HeaderSelectorsProps) {
    return (
      <WhyLabsSelect clearable={clearable} darkBackground hideLabel key={rest.label?.toString()} size="xs" {...rest} />
    );
  }
};
