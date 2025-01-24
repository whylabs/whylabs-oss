plugins {
    `java-library`
}

group = rootProject.group
version = rootProject.version
val scalaVersion = project.property("scalaVersion") as String
val druidVersion = project.property("druidVersion") as String
val whylogsVersion = project.property("whylogsVersion") as String
val amazonsdkv2 = project.property("amazonsdkv2") as String
val awssdk = project.property("awssdk") as String

fun scalaPackage(groupId: String, name: String, version: String) =
    "$groupId:${name}_$scalaVersion:$version"



dependencies {
    // internal dependencies
    api(project(":druid-extension"))

    // Core dependencies
    // DO NOT PUT SPARK OR HADOOP DEPENDENCIES HERE!
    api("org.apache.druid:druid-processing:$druidVersion") {
        exclude("org.hyperic")
        exclude("org.mozilla:rhino:.*")
    }
    api("org.apache.druid:druid-core:$druidVersion") {
        exclude("org.hyperic")
        exclude("org.mozilla:rhino:.*")
    }

    implementation("org.slf4j:slf4j-api:1.7.27")

    api("com.beust:jcommander:1.81")

    api("commons-io:commons-io:2.6")
    api("com.google.guava:guava:16.0.1")
    api("com.google.inject:guice:4.1.0")
    api("com.fasterxml.jackson.core:jackson-databind:2.10.5.1")
    api("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.13.2")
    api("com.fasterxml.jackson.module:jackson-module-parameter-names:2.13.2")
    api("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.13.2")

    api("com.google.protobuf:protobuf-java-util:3.11.0")
    api("commons-io:commons-io:2.6")
    api("com.beust:jcommander:1.81")

    // Py4j for python bridge. Must match pyproject.toml
    api("net.sf.py4j:py4j:0.10.9")

    api("com.squareup.okhttp3:okhttp:4.9.1")

    api("com.workday:timeseries-forecast:1.1.1") {
        // There's some shading that hadoop-aws does to some of the bundled libraries that
        // cause issues in certain contexts. Better to include the library directly.
        exclude(group = "org.hamcrest")
    }

    api(platform("software.amazon.awssdk:bom:$amazonsdkv2"))
    api("software.amazon.awssdk:apache-client")
    api("software.amazon.awssdk:auth")
    api("software.amazon.awssdk:sso")
    api("software.amazon.awssdk:aws-core")
    api("software.amazon.awssdk:sdk-core")
    api("software.amazon.awssdk:s3")
    api("software.amazon.awssdk:secretsmanager")
    api("software.amazon.awssdk:third-party-jackson-core")
    api("software.amazon.awssdk:kinesis")
    api("software.amazon.awssdk:sts")

    api("software.amazon.kinesis:amazon-kinesis-client:2.3.9")
    api("com.amazonaws:amazon-kinesis-producer:0.14.7")

    //implementation("software.amazon.awssdk:aws-json-protocol")
    api("com.amazonaws:aws-java-sdk-sqs:$awssdk")
    api("com.amazonaws:aws-java-sdk-core:$awssdk")
    api("com.amazonaws:aws-java-sdk-emr:$awssdk")
    api("com.amazonaws:aws-java-sdk-s3:$awssdk")
    api("com.amazonaws:aws-java-sdk-sqs:$awssdk")
    api("com.amazonaws:aws-java-sdk-sts:$awssdk")
    api("com.amazonaws:aws-java-sdk-dynamodb:$awssdk")

    api("com.amazonaws:aws-lambda-java-core:1.2.2")

    api("com.cronutils:cron-utils:9.1.6")

    // Support interacting with kinesis
    api("com.google.guava:guava:33.1.0-jre")
    api("com.cronutils:cron-utils:9.1.6")
}
