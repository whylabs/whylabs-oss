plugins {
    scala
    antlr

}

idea {
    targetVersion = "13"
}

group = rootProject.group
version = rootProject.version

val scalaVersion = project.property("scalaVersion") as String
val sparkVersion = project.property("sparkVersion") as String
val deltaVersion = project.property("deltalake") as String
val antlrVersion = project.property("antlrVersion") as String

val artifactBaseName = "${rootProject.name}-spark_$sparkVersion-scala_$scalaVersion"

sourceSets {
    main {
        withConvention(ScalaSourceSet::class) {
            scala {
                srcDirs(
                        "src/main/scala",
                        "src/main/java"
                )
            }
        }
        java {
            setSrcDirs(listOf("src/main/generated/antlr"))
        }

        resources {
            srcDirs("src/main/resources")
        }
    }
    test {
        withConvention(ScalaSourceSet::class) {
            scala {
                srcDirs("src/test/scala", "src/test/java")
            }


            resources {
                srcDirs("test/main/resources")
            }
        }
    }
}

tasks.jar {
    archiveBaseName.set(artifactBaseName)
}

fun scalaPackage(groupId: String, name: String, version: String) =
        "$groupId:${name}_$scalaVersion:$version"

val scaladoc: ScalaDoc by tasks

dependencies {
    implementation(project(":murmuration-core")) {
        exclude(group = "com.ibm.icu")
        exclude("org.apache.zookeeper:.*:.*")
        exclude("org.apache.htrace:.*:.*")
        exclude("org.apache.ivy:.*:.*")
        exclude("org.apache.xerces:.*:.*")
        exclude("org.apache.directory:.*:.*")
        exclude("org.apache.curator:.*:.*")
        exclude("org.apache.logging.log4j:log4j-core:.*")
        exclude("org.apache.logging.log4j:log4j-api:.*")
        exclude("log4j:log4j:.*")
        exclude("org.hyperic:sigar:.*")
    }

    // Lombok processors should run before micronaut
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    testCompileOnly("org.projectlombok:lombok:1.18.30")
    testAnnotationProcessor("org.projectlombok:lombok:1.18.30")

    implementation("jakarta.persistence:jakarta.persistence-api:2.2.3")
    implementation("io.micronaut:micronaut-core:3.7.7")

    //implementation("io.micronaut.serde:micronaut-serde-bom:1.3.3")

    annotationProcessor("io.micronaut.serde:micronaut-serde-processor:1.3.3")
    //implementation("io.micronaut.serde:micronaut-serde-jackson")
    implementation("com.vladmihalcea:hibernate-types-52:2.20.0")
    implementation("io.micronaut.data:micronaut-data-model:3.7.5")
    implementation("org.hibernate:hibernate-core:5.6.14.Final")

    implementation(project(":whylogsv1-parser"))

    // Add non-Spark dependencies to murmuration-core. Here we track Spark dependencies
    implementation(scalaPackage("org.apache.spark", "spark-core", sparkVersion))
    implementation(scalaPackage("org.apache.spark", "spark-sql", sparkVersion))
    implementation(scalaPackage("org.apache.spark", "spark-mllib", sparkVersion))

    // Adhoc webserver deps
    implementation("org.glassfish.jersey.containers:jersey-container-jetty-http:2.35")
    implementation("org.glassfish.jersey.media:jersey-media-json-jackson:2.35")
    implementation("com.fasterxml.jackson.module:jackson-module-jsonSchema:2.13.2")
    implementation("com.fasterxml.jackson.module:jackson-module-parameter-names:2.13.2")

    implementation("org.apache.hadoop:hadoop-client-api:3.3.2")
    implementation("org.apache.hadoop:hadoop-client-runtime:3.3.2")

    // TODO: switch back to -amzn-1
    implementation("org.apache.hadoop:hadoop-common:3.3.2") {
        exclude("org.apache.logging.log4j:log4j-core:.*")
        exclude("log4j:log4j:.*")
    }

    // support s3a for local testing
    implementation("org.apache.hadoop:hadoop-aws:3.3.2") {
        // There's some shading that hadoop-aws does to some of the bundled libraries that
        // cause issues in certain contexts. Better to include the library directly.
        exclude(group = "com.amazonaws", module = "aws-java-sdk-bundle")
        exclude("org.apache.logging.log4j:log4j-core:.*")
    }
    compileOnly("com.google.code.findbugs:jsr305:2.0.1")

    implementation("io.delta:delta-core_${scalaVersion}:${deltaVersion}")

    // metrics
    implementation("io.micrometer:micrometer-registry-cloudwatch2:latest.release")


    // testng
    testImplementation("org.testng:testng:7.4.0")
    testImplementation("org.hamcrest:hamcrest-core:2.2")
    testImplementation("org.mockito:mockito-core:3.2.4")
    testImplementation(scalaPackage("org.scalatest", "scalatest", "3.1.2"))
    implementation("org.slf4j:slf4j-log4j12:1.7.30")
    testRuntimeOnly("com.vladsch.flexmark:flexmark-profile-pegdown:0.36.8")
    testImplementation("org.apache.datasketches:datasketches-java:1.3.0-incubating")

    testImplementation("com.squareup.okhttp3:okhttp:4.5.0")

    antlr("org.antlr:antlr4:${antlrVersion}")
    implementation("org.antlr:antlr4-runtime:${antlrVersion}")
}

tasks.create<JavaExec>("scalaTest") {
    main = "org.scalatest.tools.Runner"
    jvmArgs = allJvmArgs
    args = listOf("-R", "build/classes/scala/test", "-o")
    classpath = sourceSets.test.get().runtimeClasspath
}

tasks.test {
    dependsOn("scalaTest")

    useTestNG()
    maxHeapSize = "2048m"
    jvmArgs("-Dlog4j.configuration=file://${projectDir}/configurations/log4j.properties")
    // TODO: enable Python test in the pipeline
    // environment("PYSPARK_PYTHON", "${rootProject.projectDir}/.venv/bin/python")
    testLogging {
        testLogging.showStandardStreams = true
        failFast = true
        events("passed", "skipped", "failed")
    }
}

tasks.jar {
    archiveBaseName.set(artifactBaseName)
}

// expose the jar for murmuration-bundle to consume just the jar
configurations.create("jar")

// need to add the jar to the configuration output
artifacts {
    add("jar", tasks.jar)
}

tasks.create<JavaExec>("datalake") {
    main = "ai.whylabs.batch.jobs.WhylogDeltalakeWriterJob"
    jvmArgs = allJvmArgs
    // gradle datalake --args="-sparkMaster local[1] -source /Volumes/Workspace/songbird-service/profiles/org-0/model-0/untagged/ -destination /Users/chris/work/deltalake/"
    args = System.getProperty("args", "").split(" ")
    classpath = sourceSets.main.get().runtimeClasspath
}

tasks {
    withType<Copy> {
        duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    }
}


tasks.generateGrammarSource {
    maxHeapSize = "128m"
    arguments = arguments + listOf("-visitor", "-long-messages", "-package", "ai.whylabs.antlr")
    outputDirectory = file("$projectDir/src/main/generated/antlr/ai/whylabs/antlr")
}

tasks.compileJava{
    dependsOn("generateGrammarSource")
}

spotless {
    java {
        targetExclude("src/main/generated/antlr/**")
    }
}