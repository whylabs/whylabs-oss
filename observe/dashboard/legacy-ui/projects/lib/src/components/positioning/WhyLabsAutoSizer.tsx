import React from 'react';
import AutoSizer, { AutoSizerProps } from 'react-virtualized-auto-sizer';
import { useCSPNonce } from '../../hooks/useCSPNonce';

type WhyLabsAutoSizerProps = Omit<AutoSizerProps, 'nonce'>;

export const WhyLabsAutoSizer: React.FC<WhyLabsAutoSizerProps> = (props) => {
  const { cspNonce } = useCSPNonce();
  const { children } = props;
  return (
    // For more information on passing CSP nonce to react-virtualized:
    // https://github.com/bvaughn/react-virtualized/issues/1521
    <AutoSizer {...props} nonce={cspNonce}>
      {children}
    </AutoSizer>
  );
};
