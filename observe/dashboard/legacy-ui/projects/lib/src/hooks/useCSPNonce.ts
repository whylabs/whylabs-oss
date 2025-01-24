type UseCSPNonceReturnType = { cspNonce: string };

export const useCSPNonce = (): UseCSPNonceReturnType => {
  // The CSP nonce is set by Dashboard service via a meta tag in index.html
  // It must be supplied for all inline scripts and styles
  const nonceElement = document.getElementById('csp-nonce');
  const nonceElementContent = nonceElement?.getAttribute('content');

  return { cspNonce: nonceElementContent ?? '' };
};
