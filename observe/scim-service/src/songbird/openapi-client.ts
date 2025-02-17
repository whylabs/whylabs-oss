// Songbird client will be replaced to serve each client request
export const getStandardOpenApiOptions = (): unknown => ({
  // The autogenerated OpenAPI client wants to set this to form urlencoded by default which causes OpenAPI server to return 403 ;_;
  headers: { 'Content-Type': 'application/json' },
});

type ClientConfig = {
  apiKey: string | (() => Promise<string>);
  basePath: string;
  baseOptions: unknown;
};

export const getOpenAPIClientConfig = (apiKey: string, endpoint: string): ClientConfig => ({
  apiKey,
  basePath: endpoint,
  baseOptions: getStandardOpenApiOptions(),
});
