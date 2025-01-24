import { z } from 'zod';

import { CustomTag } from '../../graphql/generated/graphql';
import {
  getOrganizationCustomTagsConfig,
  getResourceTagsInUse,
  listOrganizationCustomTags,
  updateOrganizationCustomTagsConfig,
  validateOrganizationCustomTagsConfig,
} from '../../services/data/data-service/api-wrappers/resource-tagging';
import { manageOrgProcedure, router, viewDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';

// Mutation procedures here are intended for organization admins, changing an orgId of which they are a member. Make sure that the `orgId` input is used
// in any backend query, as this is what has been authorized. Also, make sure that the admin can only update the selected fields
// that they are allowed to update. For example, they are not allowed to update the tier!!
const organizations = router({
  getOrganizationCustomTagsYaml: viewDataProcedure.query(async ({ input: { orgId }, ctx }) =>
    getOrganizationCustomTagsConfig(orgId, callOptionsFromTrpcContext(ctx)),
  ),
  validateOrganizationCustomTagsYaml: manageOrgProcedure
    .input(z.object({ yaml: z.string() }))
    .mutation(async ({ input: { orgId, yaml }, ctx }) =>
      validateOrganizationCustomTagsConfig(orgId, yaml, callOptionsFromTrpcContext(ctx)),
    ),
  updateOrganizationCustomTagsYaml: manageOrgProcedure
    .input(z.object({ yaml: z.string() }))
    .mutation(async ({ input: { orgId, yaml }, ctx }) =>
      updateOrganizationCustomTagsConfig(orgId, yaml, callOptionsFromTrpcContext(ctx)),
    ),
  getResourceTagsInUse: viewDataProcedure.query(
    async ({ input: { orgId }, ctx }): Promise<CustomTag[]> =>
      getResourceTagsInUse(orgId, callOptionsFromTrpcContext(ctx)),
  ),
  countAllOrganizationResourceTags: viewDataProcedure.query(async ({ input: { orgId }, ctx }) => {
    const list = await listOrganizationCustomTags(orgId, callOptionsFromTrpcContext(ctx));
    return list.length;
  }),
  listAllOrganizationResourceTags: viewDataProcedure.query(async ({ input: { orgId }, ctx }) =>
    listOrganizationCustomTags(orgId, callOptionsFromTrpcContext(ctx)),
  ),
});

export default organizations;
