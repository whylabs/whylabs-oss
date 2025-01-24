import { MapperKind, getDirective, mapSchema } from '@graphql-tools/utils';
import { GraphQLFieldConfig, GraphQLSchema, defaultFieldResolver } from 'graphql';

import { checkPermissionsAndResolve } from '../authz/rules/authorization';
import { authLogger } from '../authz/user-context';
import { GraphQLContext } from '../context';
import { AuthDirectiveArgs } from '../generated/graphql';

export const AUTHORIZATION_DIRECTIVE_NAME = 'auth';

/**
 * Adds the logic for the custom authorization directive to the specified GraphQL schema
 * @param schema Schema to mutate
 */
export const authorizationDirectiveTransformer = (schema: GraphQLSchema): GraphQLSchema =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (
      fieldConfig: GraphQLFieldConfig<unknown, GraphQLContext>,
    ): GraphQLFieldConfig<unknown, GraphQLContext> => {
      // get the first auth directive for this field
      const authzDirectiveArgs: AuthDirectiveArgs | undefined = getDirective(
        schema,
        fieldConfig,
        AUTHORIZATION_DIRECTIVE_NAME,
      )
        ?.slice()
        ?.shift();
      if (!authzDirectiveArgs) {
        // no auth directive specified on this field, no special logic needed
        return fieldConfig;
      }

      /**
       * If the auth directive *was* specified, mutate (kill me!) the field config to replace its resolver
       * with one that will first check auth-z requirements against request context.
       *
       * Fall back to the default field resolver to avoid having to define resolvers explicitly
       * for all fields. This is normally unnecessary if the field should just access
       * a property on the parent with the same name.
       *
       * E.g.
       * type Query { user: User }
       * type User { id: String, name: String @auth }
       *
       * Once `user` is resolved, accessing its `id` and `name` should not require explicitly defined resolvers.
       */
      const originalResolve = fieldConfig.resolve ?? defaultFieldResolver;

      fieldConfig.resolve = (...args): unknown => {
        return checkPermissionsAndResolve(
          authzDirectiveArgs,
          args[2],
          authLogger,
          () => originalResolve && originalResolve(...args),
        );
      };
      return fieldConfig;
    },
  });
