export type ScimMetadata = {
  created: Date;
  lastModified: Date;
  location?: string;
};

export type ScimUserGroup = {
  value: string;
  type?: string;
  display: string;
};

export type ScimEmail = { value: string; type?: string; primary?: boolean };

export type ScimUser = {
  id: string;
  schemas?: ['urn:ietf:params:scim:schemas:core:2.0:User'];
  userName: string;
  externalId?: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  title?: string;
  password?: string;
  active?: boolean;
  emails?: ScimEmail[];
  groups?: ScimUserGroup[];
  meta?: ScimMetadata & { resourceType: 'User' };
};

export type ScimUserAttrs = Partial<ScimUser>;
export type UserModify = ScimUserAttrs & {
  emails: { operation?: 'delete'; value: string; primary?: boolean }[];
};

export type ScimMember = {
  value: string;
  display: string;
};

export type ScimGroup = {
  id: string;
  schemas?: ['urn:ietf:params:scim:schemas:core:2.0:Group'];
  displayName: string;
  members?: ScimMember[];
};

export type ScimGroupAttrs = Partial<ScimGroup>;

export interface ScimPatchOperation {
  op: 'add' | 'replace' | 'remove';
  path?: string;
  value?: { value: string } | { value: string }[] | unknown;
}

export interface ScimGetRequest {
  attribute: string;
  operator: 'eq';
  value: string;
  rawFilter: never;
  startIndex?: number;
  count?: number;
}

export interface ScimGetResponse {
  Resources: (ScimUser | ScimGroup)[];
  totalResults?: number;
}

export type RequestContext = {
  request?: {
    header?: {
      authorization?: string;
    };
  };
};

export type RequestOptions = {
  json: boolean;
  headers: {
    'Content-Type': string;
    Authorization?: string;
  };
  host: string;
  port: string;
  protocol: string;
  method: string;
  path: string;
};

export interface ScimErrorResponse {
  status: string;
  scimType: string;
  detail: string;
}
