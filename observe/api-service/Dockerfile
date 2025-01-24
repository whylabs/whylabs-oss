# Integration test docker file
FROM gradle:7.4.2-jdk17-focal
ARG CI_JOB_TOKEN

RUN mkdir /src
WORKDIR /src
COPY . .

RUN gradle generateKotlinClient
RUN gradle :client:build

CMD ["gradle", "--build-cache", "-i", ":client:test", "-PintegTests=true"]
