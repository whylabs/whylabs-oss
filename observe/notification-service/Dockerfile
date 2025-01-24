# https://hub.docker.com/_/node?tab=tags&page=1&name=alpine3.18
FROM node:18-alpine3.18 as ecrSirenBuilder

RUN echo "building siren..."

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}
ARG FROM_EMAIL
ENV FROM_EMAIL=${FROM_EMAIL}
ARG LATEST_COMMIT
ENV LATEST_COMMIT=${LATEST_COMMIT}

WORKDIR /opt/whylabs-siren

# dependencies
COPY package.json yarn.lock .env .yarnrc.yml ./
COPY .yarn ./.yarn

# install dependencies
RUN set -ex; \
  if [ "$NODE_ENV" = "production" ]; then \
    yarn workspaces focus --all --production; \
  else \
    yarn install --immutable; \
  fi;

COPY email-templates ./email-templates
COPY dist ./dist

# remove NPM lockfiles, because we are not using NPM to resolve dependencies
# these cause false-positives when the container is scanned for vulnerabilities
# package.json files within dependencies are untouched and continue to be scanned,
# along with yarn.lock files.
RUN find . -name "package-lock.json" -delete

# Unset the npm token after we use it to pull down our private dependencies in yarn install.
# The .npmrc is what utilizes that env variable.
ENV NPM_TOKEN=redacted

# start service
ENTRYPOINT ["node", "dist/app.js"]
HEALTHCHECK CMD ["node", "dist/services/health-check.js"]
