# NOTE: we use .dockerignore to whitelist files and paths that can be copied into the container
# You may need to modify the whitelist to bring in additional files
FROM registry.gitlab.com/whylabs/ui-exp:stable as frontend

FROM node:18-alpine3.18 as deps_base
ARG NPM_TOKEN
ARG PRISMA_VERSION=5.20.0

ENV NPM_TOKEN=${NPM_TOKEN}

WORKDIR /opt/build

# dependencies - should do this first for package cache
COPY package.json yarn.lock .yarnrc.yml .yarn ./
COPY .yarn/ ./.yarn/
COPY client/package.json client/package.json
RUN --mount=type=cache,target=/opt/build/node_modules \
    yarn workspaces focus @whylabs/dashboard --production \
    && cp -R ./node_modules ./node_modules_backup

RUN mv ./node_modules_backup ./node_modules

# https://hub.docker.com/_/node?tab=tags&page=1&name=alpine3.18
FROM node:18-alpine3.18 as build_base
ARG NPM_TOKEN
ARG PRISMA_VERSION=5.20.0

ENV NPM_TOKEN=${NPM_TOKEN}
ENV PRISMA_VERSION=${PRISMA_VERSION}
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /opt/build

COPY --from=deps_base /opt/build/ ./
# install dependencies
RUN yarn install

# Copy the rest of the source code. TODO: be more selective
COPY . .

# Force prisma to regenerate the client so we have the right binaries for the client (Mac host vs Linux container)
# This must be done before we run the build
RUN rm -fr src/generated/client/libquery_engine-*
RUN npx --yes prisma@$PRISMA_VERSION generate
RUN ls -alh src/generated/client/

# build
RUN --mount=type=cache,target=/opt/build/client/dist \
    --mount=type=cache,target=/opt/build/dist \
    yarn workspaces foreach --all run build \
    && mkdir -p ./dist/public/ \
    && cp -R client/dist ./dist/public/ \
    && cp -r ./dist ./dist_backup

RUN ls dist_backup/generated/client/ -alh
RUN mv ./dist_backup ./dist

# Now build the dist image
FROM node:18-alpine3.18 as dist_image
ENV NPM_TOKEN=${NPM_TOKEN}
ENV PRISMA_VERSION=${PRISMA_VERSION}

WORKDIR /opt/whylabs-dashboard

# dependencies - should do this first for package cache
COPY --from=deps_base /opt/build/ ./
COPY prisma/schema.prisma prisma/schema.prisma
RUN ls -alh .

# remove NPM lockfiles, because we are not using NPM to resolve dependencies
# these cause false-positives when the container is scanned for vulnerabilities
# package.json files within dependencies are untouched and continue to be scanned,
# along with yarn.lock files.
RUN find . -name "package-lock.json" -delete

# Copy the built artifacts
COPY --from=build_base /opt/build/dist ./dist
COPY prisma ./prisma

# Add startup artifact
COPY scripts/start-app.sh ./scripts/start-app.sh

RUN npm install -g prisma@$PRISMA_VERSION

# production env. We only need the backend artifacts here
FROM scratch as build_production
COPY --from=dist_image / /

FROM build_production
ARG PRISMA_VERSION=5.20.0
ARG NODE_ENV=production
ARG BASE_URL
ARG LATEST_COMMIT=unknown

ENV NODE_ENV=${NODE_ENV}
ENV BASE_URL=${BASE_URL}
ENV LATEST_COMMIT=${LATEST_COMMIT}
ENV PRISMA_VERSION=${PRISMA_VERSION}


# Create a new user and group
# Install any necessary dependencies
RUN apk update \
    && apk upgrade \
    && apk add --no-cache \
    jq


# Create a group and user
RUN addgroup -S whylabs && adduser -S whyuser -G whylabs

# Tell docker that all future commands should run as the appuser user
USER whyuser

# Set the working directory
WORKDIR /opt/whylabs-dashboard

# start service
EXPOSE 3000
ENTRYPOINT ["scripts/start-app.sh"]
