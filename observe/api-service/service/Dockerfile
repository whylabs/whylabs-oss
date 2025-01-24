# Note: need an image that has x86 and arm64 architecture
FROM eclipse-temurin:17-jre-focal

RUN mkdir /app
WORKDIR /app

COPY build/distributions/service-0.1.tar service.tar
RUN tar xvf service.tar -C .

COPY configuration/log4j2.xml .

RUN ls -alh

EXPOSE 8080
ENV DEFAULT_JAVA_OPTS="-XX:+UseZGC -XX:+UnlockExperimentalVMOptions -XX:-ZUncommit -Dcom.sun.management.jmxremote -noverify"
ENV SERVICE_OPTS="-Dlog4j.configurationFile=/app/log4j2.xml"
CMD service-0.1/bin/service

