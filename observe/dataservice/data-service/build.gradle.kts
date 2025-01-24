import org.openapitools.generator.gradle.plugin.tasks.GenerateTask
import java.time.LocalDateTime


plugins {
    id("io.micronaut.application") version "3.7.10"
    id("com.google.cloud.tools.jib") version "3.3.1"
    id("io.micronaut.test-resources") version "3.7.10"
    id("com.github.johnrengelman.shadow") version "7.1.2"
    antlr
}

apply {
    plugin("org.openapi.generator")
    plugin("org.openapitools.openapistylevalidator")
}

version = "0.1"
group = "ai.whylabs.dataservice"
val antlrVersion = project.property("antlrVersion") as String

repositories {
    mavenCentral()
}

buildscript {
    repositories {
        mavenCentral()
        maven {
            url = uri("https://plugins.gradle.org/m2/")
        }
    }

    dependencies {
        classpath("org.openapitools:openapi-generator-gradle-plugin:5.3.1")
        classpath("org.openapitools.openapistylevalidator:openapi-style-validator-gradle-plugin:1.4")
    }
}

val amazonsdkv2 = project.property("amazonsdkv2") as String
val awssdk = project.property("awssdk") as String

dependencies {
    // Lombok processors should run before micronaut
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    testCompileOnly("org.projectlombok:lombok:1.18.30")
    testAnnotationProcessor("org.projectlombok:lombok:1.18.30")
    annotationProcessor("io.micronaut.data:micronaut-data-processor")
    annotationProcessor("io.micronaut:micronaut-http-validation")
    annotationProcessor("io.micronaut.micrometer:micronaut-micrometer-annotation")
    annotationProcessor("io.micronaut.openapi:micronaut-openapi")
    annotationProcessor("io.micronaut:micronaut-inject-java:3.7.10")


    implementation("io.micronaut:micronaut-http-client")
    implementation("io.micronaut:micronaut-http")
    implementation("io.micronaut:micronaut-validation")
    implementation("io.micronaut.beanvalidation:micronaut-hibernate-validator")

    implementation("io.micronaut:micronaut-jackson-databind")
    implementation("io.micronaut:micronaut-management")
    implementation("io.micronaut.data:micronaut-data-jdbc")
    implementation("io.micronaut.micrometer:micronaut-micrometer-core")
    implementation("io.micronaut.micrometer:micronaut-micrometer-registry-jmx")
    implementation("io.micronaut.micrometer:micronaut-micrometer-registry-statsd")
    implementation("io.micronaut.micrometer:micronaut-micrometer-registry-prometheus")
    implementation("io.micronaut:micronaut-runtime-osx")

    implementation("io.micronaut.sql:micronaut-jdbc-hikari")
    implementation("io.micronaut.liquibase:micronaut-liquibase")
    implementation("org.liquibase:liquibase-groovy-dsl:3.0.2")
    implementation("io.swagger.core.v3:swagger-annotations")
    implementation("jakarta.annotation:jakarta.annotation-api")
    implementation("org.apache.logging.log4j:log4j-core:2.19.0")
    implementation("io.projectreactor:reactor-core:3.5.6")
    implementation("com.opencsv:opencsv:5.8")
    implementation("org.apache.commons:commons-csv:1.10.0")
    runtimeOnly("org.apache.logging.log4j:log4j-api:2.19.0")
    runtimeOnly("org.apache.logging.log4j:log4j-slf4j2-impl:2.19.0")

    implementation("org.postgresql:postgresql:42.7.3")

    implementation("software.amazon.awssdk:bom:$amazonsdkv2")
    implementation("software.amazon.awssdk:apache-client")
    implementation("software.amazon.awssdk:auth")
    implementation("software.amazon.awssdk:sso")
    implementation("software.amazon.awssdk:aws-core")
    implementation("software.amazon.awssdk:sqs")
    implementation("software.amazon.awssdk:sdk-core")
    implementation("software.amazon.awssdk:kinesis")
    implementation("software.amazon.kinesis:amazon-kinesis-client")
    implementation("com.amazonaws:amazon-kinesis-producer:0.15.10")
    implementation("software.amazon.awssdk:s3")
    implementation("software.amazon.awssdk:secretsmanager")
    implementation("software.amazon.awssdk:sts")
    implementation("software.amazon.awssdk:s3-transfer-manager")
    implementation("software.amazon.awssdk.crt:aws-crt:0.21.7")
    // Needed for kenisis publisher
    implementation("com.amazonaws:aws-java-sdk-sts:$awssdk")

    implementation("com.amazonaws:aws-java-sdk-s3:$awssdk")
    implementation("com.fasterxml.jackson.module:jackson-module-parameter-names:2.14.0")
    implementation("io.micronaut.jms:micronaut-jms-sqs")

    // annotations
    implementation("javax.annotation:javax.annotation-api")
    implementation("io.micronaut.sql:micronaut-hibernate-jpa")
    implementation("org.hibernate:hibernate-core:5.6.14.Final")

    implementation("io.micronaut.data:micronaut-data-hibernate-jpa")
    implementation("jakarta.persistence:jakarta.persistence-api:2.2.3")
    //implementation("io.micronaut.configuration:micronaut-hibernate-jpa")
    implementation("com.vladmihalcea:hibernate-types-55:2.20.0")

    // Azure Data Explorer
    implementation("com.microsoft.azure.kusto:kusto-data:5.0.5")

    // we only depends on the output of the whylogs-spark components
    // we don't want to pull in Spark dependencies here
    implementation(project(":murmuration-core")) {
        exclude(group = "io.netty")
        exclude(group = "com.google.guava")
        exclude(group = "org.slf4j")
        exclude(group = "org.apache.logging.log4j")
        exclude(group = "io.micrometer")
        exclude(group = "com.amazonaws")
        exclude("org.hyperic:sigar:.*")
    }
    implementation(project(":murmuration", "jar")) {
        exclude(group = "com.amazonaws", module = "aws-java-sdk-bundle")
        exclude(group = "org.apache.logging.log4j")
        exclude(group="org.apache.spark")
    }
    implementation("javax.ws.rs:javax.ws.rs-api:2.1.1")

    implementation("org.yaml:snakeyaml:2.3")
    implementation("com.google.protobuf:protobuf-java:3.20.1")
    implementation("com.google.guava:guava:33.1.0-jre")
    implementation("javax.json:javax.json-api:1.1.4")
    implementation("org.glassfish:javax.json:1.1.4")
    implementation("com.clearspring.analytics:stream:2.9.6")

    runtimeOnly("org.antlr:antlr4-runtime:${antlrVersion}")

    testImplementation("org.hamcrest:hamcrest")
    testImplementation("io.micronaut.test:micronaut-test-junit5")
    testImplementation("org.junit.jupiter:junit-jupiter:5.8.1")
    testImplementation("org.testcontainers:testcontainers:1.19.3")
    testImplementation("org.testcontainers:postgresql:1.19.3")
    testImplementation("org.testcontainers:junit-jupiter:1.19.3")
}

graalvmNative.toolchainDetection.set(false)

application {
    mainClass.set("ai.whylabs.dataservice.Application")
}

sourceSets {
    main {
        java {
            setSrcDirs(listOf("src/main/java"))
        }
    }

    test {
        resources.srcDirs("src/test/java")
    }
}

tasks.create("develop", JavaExec::class) {
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("ai.whylabs.dataservice.Application")
    debug = true

    debugOptions {
        port.set(5005)
        server.set(true)
        suspend.set(false)
    }
}

java {
    sourceCompatibility = JavaVersion.toVersion("11")
    targetCompatibility = JavaVersion.toVersion("11")
}

val imageArchitecture: String = System.getenv().getOrDefault("IMAGE_ARCH", "amd64")
val gitlabSha: String = System.getenv().getOrDefault("CI_COMMIT_SHORT_SHA", "local")
tasks {
    jib {
        to {
            image = "dataservice-$imageArchitecture:$gitlabSha"
        }
        container {
            jvmFlags =
                listOf("-Dmicronaut.environments=deploy", "-Dlog4j2.configurationFile=/app/resources/log4j2-deploy.xml")
        }
        from {
            platforms {
                platform {
                    architecture = imageArchitecture
                    os = "linux"
                }
            }
        }
    }
}
micronaut {
    runtime("netty")
    testRuntime("junit5")
    processing {
        /**
         * TODO: Make this optional via env var. It breaks intellij workflows
         */
        incremental(false)
        module.set(project.name)
        group.set(project.group.toString())
        annotations.add("ai.whylabs.*")
    }
}

val shadowJar: com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar by tasks
shadowJar.apply {
    isZip64 = true
}

val tmpDir = "$buildDir/tmp"
file(tmpDir).mkdirs()

// have these paths as static path
val swaggerApiSpec = "$tmpDir/data-service-0.0.yml"

val copyInternalApi = tasks.create<Copy>("copyInternalApi") {
    dependsOn(":data-service:classes")
    from("$buildDir/classes/java/main/META-INF/swagger/data-service-0.0.yml")
    into("$buildDir/tmp")
}

val generatedClients = "$buildDir/generated"

tasks.create("generateKotlinClient", GenerateTask::class) {
    dependsOn(copyInternalApi)

    // OpenAPI gradle configuration
    generatorName.set("kotlin")
    inputSpec.set(swaggerApiSpec)
    globalProperties.set(mapOf("packageName" to "ai.whylabs.dataservice.client"))
    outputDir.set("$generatedClients/kotlin/")
    groupId.set("ai.whylabs.dataservice")
    // see: https://openapi-generator.tech/docs/generators/kotlin
    configOptions.set(
        mapOf(
            "artifactId" to "data-service-client",
            "artifactDescription" to "Data Service client API",
            "dateLibrary" to "java8",
            "enumPropertyNaming" to "PascalCase",
            "developerEmail" to "support@whylabs.ai",
            "developerName" to "whylabs.ai",
            "developerOrganization" to "WhyLabs, Inc",
            "developerOrganizationUrl" to "https://whylabs.ai",
            "licenseName" to "Apache License 2.0",
            "licenseUrl" to "https://www.apache.org/licenses/LICENSE-2.0"
        )
    )
    packageName.set("ai.whylabs.dataservice.client")
    invokerPackage.set("ai.whylabs.dataservice.client.invoker")
    modelPackage.set("ai.whylabs.dataservice.client.model")
    apiPackage.set("ai.whylabs.dataservice.client.api")
    generateModelDocumentation.set(true)
    skipOverwrite.set(false)
}

tasks.create("generateJavaClient", GenerateTask::class) {
    dependsOn(copyInternalApi)

    // OpenAPI gradle configuration
    generatorName.set("java")
    inputSpec.set(swaggerApiSpec)
    globalProperties.set(mapOf("packageName" to "ai.whylabs.dataservice.client"))
    outputDir.set("$generatedClients/java/")
    groupId.set("ai.whylabs.dataservice")
    version.set("0.1-SNAPSHOT")
    httpUserAgent.set("data-service-api/1.0/java")
    // see: https://openapi-generator.tech/docs/generators/java
    configOptions.set(
        mapOf(
            "artifactId" to "data-service-client",
            "artifactDescription" to "Data Service API client",
            "dateLibrary" to "java8",
            "enumPropertyNaming" to "PascalCase",
            "developerEmail" to "support@whylabs.ai",
            "developerName" to "whylabs.ai",
            "developerOrganization" to "WhyLabs, Inc",
            "developerOrganizationUrl" to "https://whylabs.ai",
            "licenseName" to "Apache License 2.0",
            "licenseUrl" to "https://www.apache.org/licenses/LICENSE-2.0"
        )
    )
    packageName.set("ai.whylabs.dataservice")
    invokerPackage.set("ai.whylabs.dataservice.invoker")
    modelPackage.set("ai.whylabs.dataservice.model")
    apiPackage.set("ai.whylabs.dataservice.api")
    generateModelDocumentation.set(true)
    skipOverwrite.set(false)
    // add logic for publishing to our maven repo
    doLast {
        val file = file("$generatedClients/java/build.gradle")
        val content = file.readLines() + listOf(
            """
apply plugin: 'maven-publish'

task sourceJar(type: Jar) {
    from sourceSets.main.allJava
    archiveClassifier = "sources"
}

publishing {
    publications {
        library(MavenPublication) {
            from components.java
            artifact sourceJar
        }
    }
    repositories {
        maven {
            // data-service-java-client project id is 42712779
            url "https://gitlab.com/api/v4/projects/42712779/packages/maven"
            credentials(HttpHeaderCredentials) {
                name = 'Job-Token'
                value = System.getenv("CI_JOB_TOKEN")
            }
            authentication {
                header(HttpHeaderAuthentication)
            }
        }
    }
}"""
        )

        file.printWriter().use { w ->
            content.forEach {
                w.println(it)
            }
        }
    }
}

tasks.create("generateNodeClient", GenerateTask::class) {
    dependsOn(copyInternalApi)

    // bump this version if there's a major API change
    val majorMinorVersion = "0.1"

    // OpenAPI gradle configuration
    generatorName.set("typescript-axios")
    inputSpec.set(swaggerApiSpec)
    outputDir.set("$generatedClients/node/")
    httpUserAgent.set("data-service-node-client/1.0/typescript")
    // see: https://openapi-generator.tech/docs/generators/typescript-node
    configOptions.set(
        mapOf(
            "withInterfaces" to "true",
            "npmName" to "@whylabs/data-service-node-client",
            "npmVersion" to "$majorMinorVersion.0",
            "supportsES6" to "true"
        )
    )
    generateModelDocumentation.set(true)

    doLast {
        // project ID from https://gitlab.com/whylabs/core/data-service-node-client
        val nodeClientProjectId = 41911239

        val tmpDir = "${project.buildDir}/tmp/data-service-client"
        val result = try {
            project.exec {
                commandLine =
                    "git clone --depth 1 git@gitlab.com:whylabs/core/data-service-node-client.git $tmpDir".split(' ')
            }
        } catch (e: Exception) {
            logger.error("Failed to clone data service client", e.message)
            null
        }

        val mapper = com.fasterxml.jackson.databind.ObjectMapper()
            .enable(com.fasterxml.jackson.databind.SerializationFeature.INDENT_OUTPUT)

        var currentPathVersion = 0
        if (result?.exitValue != 0) {
            logger.error("Failed to clone data service client. We cannot infer current version")
        } else {
            file("$tmpDir/package.json").inputStream().use {
                val pkg = mapper.reader().readTree(it)
                val version = pkg.get("version").asText()
                currentPathVersion = version.split('.')[2].toInt()
            }
        }
        val pkgJson = file("build/generated/node/package.json")
        val tmp = kotlin.io.createTempFile("pkg", ".json", temporaryDir)
        pkgJson.inputStream().use {
            val pkg = mapper.reader().readTree(it).deepCopy<com.fasterxml.jackson.databind.node.ObjectNode>()
            val newVersionString = "$majorMinorVersion.${currentPathVersion + 1}"
            pkg.put("version", newVersionString)
            val nodeFactory = mapper.nodeFactory
            val pubConfig = nodeFactory.objectNode()
                .put("@whylabs:registry", "https://gitlab.com/api/v4/projects/$nodeClientProjectId/packages/npm/")
            pkg.set<com.fasterxml.jackson.databind.node.ObjectNode>("publishConfig", pubConfig)
            pkg.set<com.fasterxml.jackson.databind.node.ObjectNode>(
                "files",
                mapper.valueToTree(kotlin.collections.listOf("dist/"))
            )

            mapper.writeValue(tmp, pkg)
        }

        logger.info("Copy content from $tmp to $pkgJson")
        file(tmp).copyTo(pkgJson, overwrite = true)

        file(tmpDir).deleteRecursively()
    }

    tasks.named<Test>("test"){
        useJUnitPlatform()
        maxHeapSize = "2048m"
        //jvmArgs("-Dlog4j.configuration=file://${projectDir}/configurations/log4j.properties")

        testLogging {
            testLogging.showStandardStreams = true
            failFast = true
            events("passed", "skipped", "failed")
        }
    }
}

tasks.withType<Jar> {
    // Add version string to jar manifest. Currently used to tag some kinesis messages
    manifest {
        attributes["Implementation-Version"] = "${project.name} ${project.version}(${gitlabSha}) built on ${LocalDateTime.now()}"
    }
}