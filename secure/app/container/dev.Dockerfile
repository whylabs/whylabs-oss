FROM node:18-alpine3.18

ENV NPM_TOKEN=${NPM_TOKEN}

RUN mkdir /app
WORKDIR /app

RUN apk add --update bash

EXPOSE 3030
