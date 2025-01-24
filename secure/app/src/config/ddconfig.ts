// Document: https://docs.datadoghq.com/integrations/content_security_policy_logs/?tab=firefox&site=us5
const ddBaseUrl = `https://browser-intake-us5-datadoghq.com/api/v2/logs`;
// safe to expose to the client. See https://docs.datadoghq.com/logs/log_collection/javascript/
// Link: https://us5.datadoghq.com/organization-settings/client-tokens
const datadogPublicClientToken = 'pubb097979efe82c6957a18b02561470d21';

export const ddCspReportingUrl = (stage: string, region: string): string => {
  const ddTags = new Map<string, string>([
    ['stage', stage],
    ['env', stage],
    ['region', region],
    ['service', 'whylabs-app'],
  ]);
  const ddTagsParam = Array.from(ddTags.entries())
    .map(([key, value]) => `${key}:${value}`)
    .join(',');
  const searchParams = new URLSearchParams({
    'dd-api-key': datadogPublicClientToken,
    'dd-evp-origin': 'content-security-policy',
    ddsource: 'csp-report',
    ddtags: ddTagsParam,
  });

  return `${ddBaseUrl}?${searchParams.toString()}`;
};
