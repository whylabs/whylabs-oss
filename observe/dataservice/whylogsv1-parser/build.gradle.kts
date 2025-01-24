import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar

group = rootProject.group
version = rootProject.version
description = "whylogsv1-parser"

plugins {
    `java-library`
    id("com.github.johnrengelman.shadow") version ("7.1.2")
}

val whylogsVersion = project.property("whylogsVersion") as String


dependencies {
    api("ai.whylabs:whylogs-core-bundle:$whylogsVersion")

    // This is for compile only so we can convert from Druid's datasketches to our DS
    implementation("org.apache.datasketches:datasketches-java:1.3.0-incubating")

    implementation("org.slf4j:slf4j-log4j12:1.7.30")

    // metrics
    implementation("io.micrometer:micrometer-registry-cloudwatch2:latest.release")

    compileOnly("commons-io:commons-io:2.6")
    compileOnly("com.google.guava:guava:16.0.1")
    implementation("com.google.inject:guice:4.1.0")
    compileOnly("com.google.code.findbugs:jsr305:2.0.1")

    testImplementation("org.testng:testng:7.4.0")

    // lombok support
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    testCompileOnly("org.projectlombok:lombok:1.18.30")
    testAnnotationProcessor("org.projectlombok:lombok:1.18.30")
}

tasks.withType<JavaCompile>() {
    options.encoding = "UTF-8"
}

tasks.test {
    useTestNG()
}

val shadowJar: ShadowJar by tasks
shadowJar.dependsOn(tasks.build)
val packagedJarName = "whylogsv1-parser.jar"
shadowJar.apply {
    dependencies {
        // double load logging jars is always a headache
        exclude(dependency("org.slf4j:slf4j-api"))

        exclude(dependency("com.google.guava:guava"))
        exclude(dependency("com.google.inject:guice"))
        exclude(dependency("com.fasterxml.jackson.core:jackson-databind"))
        exclude(dependency("com.google.code.findbugs:jsr305"))
        exclude(dependency("commons-io:commons-io"))
    }

    archiveFileName.set(packagedJarName)
}
// Jakob: I think we can delete all of the below.
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
