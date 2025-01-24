ARG BUILD_ENV=production

FROM registry.gitlab.com/whylabs/ui-exp:stable as frontend
# https://hub.docker.com/_/node?tab=tags&page=1&name=alpine3.18
FROM node:18-alpine3.18 as base

ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}

WORKDIR /opt/whylabs-dashboard

# NOTE: we use .dockerignore to whitelist files and paths that can be copied into the container
# You may need to modify the whitelist to bring in additional files

# dependencies
COPY package.json yarn.lock .env .yarnrc.yml ./
COPY .yarn ./.yarn

# install dependencies
RUN yarn workspaces focus @whylabs/dashboard --production

# remove NPM lockfiles, because we are not using NPM to resolve dependencies
# these cause false-positives when the container is scanned for vulnerabilities
# package.json files within dependencies are untouched and continue to be scanned,
# along with yarn.lock files.
RUN find . -name "package-lock.json" -delete

# build
COPY dist/ ./dist/
RUN mkdir ./dist/public/
COPY client/dist ./dist/public/v2/

# src is required for now as it contains GraphQL schema files
COPY src/ ./src/

# local env. We want to copy both frontend and backend here
FROM scratch as build_local

COPY --from=base / /
COPY --from=frontend /opt/whylabs-observatory/build/ ./dist/public/

# production env. We only need the backend artifacts here
FROM scratch as build_production
COPY --from=base / /

FROM build_${BUILD_ENV}

ARG NODE_ENV=production
ARG BASE_URL
ARG NPM_TOKEN
ARG LATEST_COMMIT=unknown

ENV NODE_ENV=${NODE_ENV}
ENV BASE_URL=${BASE_URL}
ENV LATEST_COMMIT=${LATEST_COMMIT}

WORKDIR /opt/whylabs-dashboard

# start service
EXPOSE 3000
ENTRYPOINT ["node", "dist/app.js"]
