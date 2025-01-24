import fetch from 'node-fetch';
import {
  ScimErrorResponse,
  ScimGetResponse,
  ScimGroup,
  ScimGroupAttrs,
  ScimPatchOperation,
  ScimUser,
  ScimUserAttrs,
} from '../../../types';
import { Response } from 'node-fetch';
import { Role } from '@whylabs/songbird-node-client';
import { getSongbirdClient } from '../../../songbird/songbird-client';

export const apiKey = process.env.ACCOUNT_API_KEY ?? '';
// const basePath = 'http://localhost:8891';
// const basePath = 'https://api.whylabsapp.com/scim';
const basePath = 'https://songbird.development.whylabsdev.com/scim';

export const defaultHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey}`,
};

export const getUser = async (id: string): Promise<ScimUser> => {
  const res = await fetch(`${basePath}/Users/${id}`, {
    method: 'GET',
    headers: defaultHeaders,
  });
  expect(res.status).toBe(200);
  return (await res.json()) as ScimUser;
};

export const getUserByEmail = async (email: string): Promise<ScimUser | null> => {
  const filter = `userName eq "${email}"`;
  const params = new URLSearchParams({ filter });
  const res = await fetch(`${basePath}/Users?${params.toString()}`, {
    method: 'GET',
    headers: defaultHeaders,
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as ScimGetResponse;
  expect(Array.isArray(data.Resources));
  return (data.Resources[0] as ScimUser) ?? null;
};

export const getUsers = async (params: Record<string, string>): Promise<ScimUser[]> => {
  const url = `${basePath}/Users?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: defaultHeaders,
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as ScimGetResponse;
  expect(Array.isArray(data.Resources));
  return data.Resources as ScimUser[];
};

const checkExpectedError = async (
  res: Response,
  errorStatus: number,
  validator: ((err: ScimErrorResponse) => void) | undefined = undefined,
): Promise<ScimErrorResponse> => {
  expect(res.status).toBe(errorStatus);
  const errResp = (await res.json()) as ScimErrorResponse;
  if (validator) validator(errResp);
  return errResp;
};

export const getUserExpectError = async (
  id: string,
  errorStatus: number,
  validator: ((err: ScimErrorResponse) => void) | undefined = undefined,
): Promise<ScimErrorResponse> => {
  const url = `${basePath}/Users/${id}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: defaultHeaders,
  });
  return checkExpectedError(res, errorStatus, validator);
};

export const createUser = async (attrs: object): Promise<ScimUser> => {
  const res = await fetch(`${basePath}/Users`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(attrs),
  });
  expect(res.status).toBe(201);
  return (await res.json()) as ScimUser;
};

export const deleteUser = async (id: string): Promise<void> => {
  const res = await fetch(`${basePath}/Users/${id}`, {
    method: 'DELETE',
    headers: defaultHeaders,
  });
  expect(res.status).toBe(204);
  return;
};

export const createUserExpectError = async (
  attrs: object,
  errorStatus: number,
  validator: ((err: ScimErrorResponse) => void) | undefined = undefined,
): Promise<ScimErrorResponse> => {
  const res = await fetch(`${basePath}/Users`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(attrs),
  });
  return checkExpectedError(res, errorStatus, validator);
};

export const putUser = async (id: string, attrs: object): Promise<ScimUser> => {
  const res = await fetch(`${basePath}/Users/${id}`, {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(attrs),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as ScimUser;
};

export const putUserExpectError = async (
  id: string,
  attrs: object,
  errorStatus: number,
  validator: ((err: ScimErrorResponse) => void) | undefined = undefined,
): Promise<ScimErrorResponse> => {
  const res = await fetch(`${basePath}/Users/${id}`, {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(attrs),
  });
  return checkExpectedError(res, errorStatus, validator);
};

export const patchUser = async (id: string, ops: ScimPatchOperation[]): Promise<ScimUser> => {
  const res = await fetch(`${basePath}/Users/${id}`, {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify({ Operations: ops }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as ScimUser;
};

export const patchUserExpectError = async (
  id: string,
  ops: ScimPatchOperation[],
  errorStatus: number,
  validator: ((err: ScimErrorResponse) => void) | undefined = undefined,
): Promise<ScimErrorResponse> => {
  const res = await fetch(`${basePath}/Users/${id}`, {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify({ Operations: ops }),
  });
  return checkExpectedError(res, errorStatus, validator);
};

export const resetUser = async (
  attrs: ScimUserAttrs & { userName: string },
  recreate = true,
): Promise<ScimUser | null> => {
  const user = await getUserByEmail(attrs.userName);
  if (user) await deleteUser(user.id ?? '');
  if (recreate) return createUser(attrs);
  return null;
};

export const getGroup = async (id: string): Promise<ScimGroup> => {
  const res = await fetch(`${basePath}/Groups/${id}`, {
    method: 'GET',
    headers: defaultHeaders,
  });
  expect(res.status).toBe(200);
  return (await res.json()) as ScimGroup;
};

export const getGroups = async (): Promise<ScimGroup[]> => {
  const res = await fetch(`${basePath}/Groups`, {
    method: 'GET',
    headers: defaultHeaders,
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as ScimGetResponse;
  expect(Array.isArray(data.Resources));
  return data.Resources as ScimGroup[];
};

const songbirdClient = getSongbirdClient(apiKey);
export const getExpectedGroupIds = async (accountOrgId: string): Promise<string[]> => {
  const managedOrgResp = await songbirdClient.accounts.listManagedOrganizations(accountOrgId);
  expect(managedOrgResp.data.length).toBeGreaterThanOrEqual(1);
  const allOrgIds = [...managedOrgResp.data.map((d) => d.orgId), accountOrgId];
  return allOrgIds.flatMap((orgId) => Object.values(Role).map((role) => `whylabs-${orgId}:${role.toLowerCase()}`));
};

export const putGroup = async (id: string, groupAttrs: ScimGroupAttrs): Promise<ScimGroup> => {
  const res = await fetch(`${basePath}/Groups/${id}`, {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(groupAttrs),
  });
  const json = await res.json();
  expect(res.status).toBe(200);
  return json as ScimGroup;
};

export const putGroupReq = async (id: string, groupAttrs: ScimGroupAttrs): Promise<Response> => {
  const res = await fetch(`${basePath}/Groups/${id}`, {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(groupAttrs),
  });
  return res;
};

export const patchGroup = async (id: string, operations: ScimPatchOperation[]): Promise<ScimGroup> => {
  const res = await fetch(`${basePath}/Groups/${id}`, {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify({ Operations: operations }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as ScimGroup;
};
