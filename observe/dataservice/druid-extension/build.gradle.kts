import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import java.time.LocalDateTime


group = rootProject.group
version = rootProject.version
description = "druid-whylabs-extensions"

plugins {
    `java-library`
    id("com.github.johnrengelman.shadow") version ("6.1.0")

}

val whylogsVersion = project.property("whylogsVersion") as String
val druidVersion = project.property("druidVersion") as String
val awssdk = project.property("awssdk") as String

dependencies {
    api("ai.whylabs:whylogs-core-bundle:$whylogsVersion")
    implementation("es.moki.ratelimitj:ratelimitj-inmemory:0.7.0")
    implementation("org.apache.commons:commons-math3:3.6.1")
    implementation("com.google.code.gson:gson:2.9.0")

    // This is for compile only so we can convert from Druid's datasketches to our DS
    implementation("org.apache.datasketches:datasketches-java:1.3.0-incubating")

    implementation("org.apache.druid:druid-processing:$druidVersion") {
        exclude("org.apache.logging.log4j:log4j-core:.*")
        exclude("log4j:log4j:.*")
        exclude("org.hyperic")
        exclude("org.mozilla:rhino:.*")
    }
    
    // metrics
    implementation("io.micrometer:micrometer-registry-cloudwatch2:latest.release")

    compileOnly("org.apache.druid:druid-core:$druidVersion") {
        exclude("org.hyperic")
        exclude("org.mozilla:rhino:.*")

    }

    compileOnly("commons-io:commons-io:2.6")
    compileOnly("com.google.guava:guava:16.0.1")
    implementation("com.google.inject:guice:4.1.0")
    compileOnly("com.fasterxml.jackson.core:jackson-databind:2.10.5.1")
    compileOnly("com.google.code.findbugs:jsr305:2.0.1")
    implementation("com.amazonaws:aws-java-sdk-s3:$awssdk")
    implementation("com.amazonaws:aws-java-sdk-kinesis:$awssdk")
    implementation("com.amazonaws:amazon-kinesis-producer:0.15.10")

    testImplementation("junit:junit:4.12")
    testImplementation("org.hamcrest:hamcrest-core:2.2")
    testImplementation("org.mockito:mockito-core:3.2.4")

    // lombok support
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    testCompileOnly("org.projectlombok:lombok:1.18.30")
    testAnnotationProcessor("org.projectlombok:lombok:1.18.30")
}

tasks.withType<JavaCompile>() {
    options.encoding = "UTF-8"
}

val shadowJar: ShadowJar by tasks
shadowJar.dependsOn(tasks.build)
val packagedJarName = "whylabs-extension.jar"
shadowJar.apply {
    dependencies {
        // double load logging jars is always a headache
        exclude(dependency("org.slf4j:slf4j-api"))

        exclude(dependency("org.apache.druid:druid-core"))
        exclude(dependency("org.apache.druid:druid-processing"))
        exclude(dependency("com.google.guava:guava"))
        exclude(dependency("com.google.inject:guice"))
        exclude(dependency("com.fasterxml.jackson.core:jackson-databind"))
        exclude(dependency("com.google.code.findbugs:jsr305"))
        exclude(dependency("commons-io:commons-io"))
    }

    archiveFileName.set(packagedJarName)
}

// this SHA value is set in gitlab
val commitShortSha = System.getenv("CI_COMMIT_SHORT_SHA") ?: "UNKNOWN"
// Druid expects a tar file with a folder <extension-name> and a list of jar files inside
val extensionBaseName = "whylabs"

tasks.create("tgz", Tar::class.java) {
    dependsOn(shadowJar)

    archiveFileName.set("$extensionBaseName-$commitShortSha.tar.gz")
    into(extensionBaseName) {
        from("build/libs")
        include(packagedJarName)
    }
    destinationDirectory.set(file("build/tar"))
    compression = Compression.GZIP
}

tasks.withType<Jar> {
    // Add version string to jar manifest. Currently used to tag some kinesis messages
    manifest {
        attributes["Implementation-Version"] = "${project.name} ${project.version}(${commitShortSha}) built on ${LocalDateTime.now()}"
    }
}
