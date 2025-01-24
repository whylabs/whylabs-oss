import { AppShell, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import WhyLabsTitle from '~/components/design-system/typography/WhyLabsTitle';
import { WhyLabsSuperDatePickerProps } from '~/components/super-date-picker/utils';
import { WhyLabsSuperDatePicker } from '~/components/super-date-picker/WhyLabsSuperDatePicker';
import { isString } from '~/utils/typeGuards';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { ReactElement, ReactNode } from 'react';

import { BetaBadge } from '../beta/BetaBadge';
import { WhoAmI } from '../buttons/WhoAmI';
import {
  WhyLabsBreadCrumbItem,
  WhyLabsBreadCrumbs,
  WhyLabsCloseButton,
  WhyLabsSelect,
  WhyLabsSelectProps,
} from '../design-system';
import { DemoWarningBar } from '../design-system/banner/DemoWarningBar';
import { ImpersonationWarningBar } from '../design-system/banner/ImpersonationWarningBar';
import { SecondPageHeader } from './SecondPageHeader';
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
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 'inherit',
    width: '100%',
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
      width: 280,
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
    paddingLeft: 24,
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
  'className' | 'clearable' | 'data' | 'itemComponent' | 'label' | 'loading' | 'onChange' | 'value' | 'size'
>;

export type HeaderField = {
  type: 'select';
} & HeaderSelectorsProps;

type NonCustomizableDatePickerProps = Pick<
  WhyLabsSuperDatePickerProps,
  'dynamicPresetSearchParamKey' | 'startDateSearchParamKey' | 'endDateSearchParamKey' | 'withinPortal'
>;

type SinglePageLayoutProps = StyleProps & {
  breadCrumbs?: WhyLabsBreadCrumbItem[];
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
  pageTitle?: string | ReactElement;
  onClosePage?: () => void;
  secondaryHeader?: ReactNode;
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
  breadCrumbs,
  children,
  classNames,
  displayBetaBadge,
  datePickerConfig,
  headerFields,
  pageTitle,
  onClosePage,
  hideHeader,
  secondaryHeader,
}: SinglePageLayoutProps): JSX.Element => {
  const { classes, cx } = useStyles({ hideHeader });
  const { visible: isDatePickerVisible, ...customGlobalPickerProps } = datePickerConfig ?? {};

  const titleSection = (() => {
    const renderTitle = () => {
      if (isString(pageTitle))
        return (
          <WhyLabsTitle element="h1" className={classes.pageTitle}>
            {pageTitle}
          </WhyLabsTitle>
        );
      return pageTitle || null;
    };
    return (
      <>
        {renderTitle()}
        {displayBetaBadge && <BetaBadge />}
      </>
    );
  })();

  const titleOnRightSection = displayBetaBadge && !!pageTitle;

  const renderHeader = () => {
    if (hideHeader) return <></>;

    const headerFieldsElement = (() => {
      if (!headerFields?.length) return null;

      return <div className={classes.headerSelectorsRoot}>{headerFields.map(renderField)}</div>;
    })();

    const primaryHeaderFields = (() => {
      // If there is a secondary header, we don't want to render the header fields on the primary header
      if (secondaryHeader) return null;
      return headerFieldsElement;
    })();

    const secondaryHeaderElement = (() => {
      if (!secondaryHeader) return null;
      return <SecondPageHeader preTitleChildren={headerFieldsElement}>{secondaryHeader}</SecondPageHeader>;
    })();

    return (
      <div>
        <DemoWarningBar />
        <ImpersonationWarningBar />
        <SinglePageHeader secondaryHeader={secondaryHeaderElement}>
          <div className={classes.header}>
            <div className={classes.headerChildrenContainer}>
              {primaryHeaderFields}
              {!!breadCrumbs?.length && <WhyLabsBreadCrumbs items={breadCrumbs} />}
              {titleOnRightSection ? null : titleSection}
            </div>
            <div className={classes.rightControls}>
              {titleOnRightSection ? <div className={classes.rightAlignedTitle}>{titleSection}</div> : null}
              {!!isDatePickerVisible && (
                <WhyLabsSuperDatePicker {...defaultGlobalPickerProps} {...customGlobalPickerProps} />
              )}
              <WhoAmI />
              {onClosePage && <WhyLabsCloseButton label="Close page" onClick={onClosePage} size={30} />}
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

  function renderSelectField({ clearable = false, size = 'xs', ...rest }: HeaderSelectorsProps) {
    return (
      <WhyLabsSelect
        clearable={clearable}
        darkBackground
        hideLabel={!secondaryHeader}
        key={rest.label?.toString()}
        size={size}
        {...rest}
      />
    );
  }
};
