FROM node:18-alpine3.18

WORKDIR /opt/whylabs-observatory

COPY ./projects/app/build/ ./build/
RUN ls -lR ./build
RUN cat ./build/index.html
