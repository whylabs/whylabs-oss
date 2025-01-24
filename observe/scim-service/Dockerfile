FROM node:18-alpine3.18 as base

ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}

ARG NODE_ENV=production
ARG LATEST_COMMIT=unknown

ENV NODE_ENV=${NODE_ENV}
ENV LATEST_COMMIT=${LATEST_COMMIT}
ENV LOG_LEVEL=info

WORKDIR /opt/scim-service

# NOTE: we use .dockerignore to whitelist files and paths that can be copied into the container
# You may need to modify the whitelist to bring in additional files

# dependencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

## install dependencies
RUN yarn workspaces focus --production

# remove NPM lockfiles, because we are not using NPM to resolve dependencies
# these cause false-positives when the container is scanned for vulnerabilities
# package.json files within dependencies are untouched and continue to be scanned,
# along with yarn.lock files.
RUN find . -name "package-lock.json" -delete

# build
COPY dist/ ./dist/


FROM scratch as build_production
COPY --from=base / /

WORKDIR /opt/scim-service


# start service
EXPOSE 8891
ENTRYPOINT ["node", "dist/app.js"]

