group = rootProject.group
version = rootProject.version
description = "whylogsv1-cat"

plugins {
    application
}

dependencies {

    implementation(project(":whylogsv1-parser"))
    implementation("info.picocli:picocli:4.7.1")


    // This is for compile only so we can convert from Druid's datasketches to our DS
    implementation("org.apache.datasketches:datasketches-java:1.3.0-incubating")

    implementation("org.slf4j:slf4j-log4j12:1.7.30")

    compileOnly("commons-io:commons-io:2.6")
    compileOnly("com.google.guava:guava:16.0.1")
    implementation("com.google.inject:guice:4.1.0")
    compileOnly("com.google.code.findbugs:jsr305:2.0.1")

    testImplementation("org.testng:testng:7.4.0")
    testImplementation("org.hamcrest:hamcrest-core:2.2")
    testImplementation("org.mockito:mockito-core:3.2.4")

    // lombok support
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    testCompileOnly("org.projectlombok:lombok:1.18.30")
    testAnnotationProcessor("org.projectlombok:lombok:1.18.30")
}

application {
    mainClass.set("ai.whylabs.whylogsv1.cat.WhyLogsV1Cat")
}

tasks.withType<JavaCompile>() {
    options.encoding = "UTF-8"
}

tasks.test {
    useTestNG()
}