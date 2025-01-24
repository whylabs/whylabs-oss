import { ReactNode, forwardRef } from 'react';

type ClickableDivProps = {
  'aria-label'?: string;
  className?: string;
  children: ReactNode;
  id?: string;
  onClick: (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
};

export const ClickableDiv = forwardRef<HTMLDivElement, ClickableDivProps>(({ children, onClick, ...rest }, ref) => {
  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onClick(event);
        }
      }}
      ref={ref}
      role="button"
      tabIndex={0}
      {...rest}
    >
      {children}
    </div>
  );
});
