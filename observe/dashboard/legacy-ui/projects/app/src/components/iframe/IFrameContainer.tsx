import { LoadingOverlay, createStyles } from '@mantine/core';
import { CSSProperties, useState } from 'react';

type StyleProps = {
  height?: CSSProperties['height'];
  width?: CSSProperties['width'];
};

const DEFAULT_HEIGHT = 600;
const DEFAULT_WIDTH = 900;

export const useStyles = createStyles((_, { height = DEFAULT_HEIGHT, width = DEFAULT_WIDTH }: StyleProps) => ({
  root: {
    height,
    position: 'relative',
    width,
  },
  iframe: {
    border: 'none',
    display: 'block',
    visibility: 'visible',
    position: 'unset',
    height,
    width,
  },
  hidden: {
    visibility: 'hidden',
    position: 'absolute',
    top: 0,
  },
}));

type IIFrameContainerProps = StyleProps & {
  classNames?: {
    root?: string;
    iframe?: string;
  };
  id: string;
  title: string;
  url: string;
  loadingComponent?: JSX.Element;
  loading?: boolean;
};

export const IFrameContainer = ({
  classNames,
  id,
  title,
  url,
  loadingComponent,
  loading,
  ...styleProps
}: IIFrameContainerProps): JSX.Element => {
  const { classes, cx } = useStyles(styleProps);
  const [isLoading, setIsLoading] = useState(true);
  const totalLoading = isLoading || loading;

  return (
    <div className={cx(classes.root, classNames?.root)}>
      {totalLoading && (loadingComponent || <LoadingOverlay visible />)}
      <iframe
        className={cx(
          classes.iframe,
          {
            [classes.hidden]: totalLoading,
          },
          classNames?.iframe,
        )}
        id={id}
        onLoad={onLoadIframe}
        src={url}
        title={title}
      />
    </div>
  );

  function onLoadIframe() {
    setIsLoading(false);
  }
};
