import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm")
    id("org.jetbrains.kotlin.kapt")
    id("org.jetbrains.kotlin.plugin.allopen")
    id("org.jlleitschuh.gradle.ktlint")
    id("org.jlleitschuh.gradle.ktlint-idea")
    id("com.github.johnrengelman.shadow") version "7.1.2"
    id("io.micronaut.application") version "3.7.0"
    idea
    jacoco
}

val micronautVersion: String by project
val kotlinVersion: String by project

version = "0.1"
group = "ai.whylabs.songbird"

val ciToken = System.getenv("CI_JOB_TOKEN")
val usePAT = (ciToken == "" || ciToken == null)

repositories {
    mavenCentral()
    jcenter()
    maven {
        setUrl("https://snapshots.elastic.co/maven/")
    }
    maven {
        name = "Gitlab-DataService"
        // https://gitlab.com/whylabs/core/data-service-java-client/-/packages
        url = uri("https://gitlab.com/api/v4/projects/42712779/packages/maven")
        if (usePAT) {
            println("Using PAT for access to data service package")
            credentials(HttpHeaderCredentials::class) {
                name = "Private-Token"
                value = System.getenv("NPM_TOKEN")
            }
        } else {
            println("Using CI_JOB_TOKEN for access to data service package")
            credentials(HttpHeaderCredentials::class) {
                name = "Job-Token"
                value = ciToken
            }
        }

        authentication {
            create<HttpHeaderAuthentication>("header")
        }
    }
}

micronaut {
    runtime("netty")
    testRuntime("junit5")
    processing {
        incremental(true)
        annotations("ai.whylabs.songbird.*")
    }
}

kapt {
    correctErrorTypes = true
}

dependencies {
    // kotlin
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:$kotlinVersion")
    implementation("org.jetbrains.kotlin:kotlin-reflect:$kotlinVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.4.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactive:1.4.2")

    // basic micronaut
    implementation("io.micronaut:micronaut-runtime")
    implementation("io.micronaut:micronaut-validation")
    implementation("io.micronaut.kotlin:micronaut-kotlin-runtime")
    implementation("io.micronaut:micronaut-http-server-netty")
    implementation("io.micronaut:micronaut-http-client")
    implementation("io.micronaut.security:micronaut-security")
    implementation("io.micronaut.kotlin:micronaut-kotlin-extension-functions")

    // reactive
    implementation("io.micronaut.rxjava2:micronaut-rxjava2")

    // netty: https://security.snyk.io/vuln/SNYK-JAVA-IONETTY-1584064
    implementation("io.netty:netty-codec:4.1.86.Final")
    implementation("io.netty:netty-codec-http:4.1.71.Final")

    // metrics
    implementation("io.micronaut.micrometer:micronaut-micrometer-core")
    implementation("io.micronaut:micronaut-management")
    implementation("io.micronaut.micrometer:micronaut-micrometer-registry-cloudwatch")
    implementation("io.micronaut.micrometer:micronaut-micrometer-registry-datadog")

    // caching
    implementation("io.micronaut.cache:micronaut-cache-core")
    implementation("io.micronaut.cache:micronaut-cache-caffeine")

    implementation("io.swagger.core.v3:swagger-annotations:2.2.20")

    // fault tolerance
    implementation("io.github.resilience4j:resilience4j-kotlin:1.7.1")
    implementation("io.github.resilience4j:resilience4j-consumer:1.7.1")
    implementation("io.github.resilience4j:resilience4j-micronaut:1.7.1")
    implementation("io.github.resilience4j:resilience4j-micrometer:1.7.1")
    implementation("io.github.resilience4j:resilience4j-ratelimiter:1.7.1")

    // whylogs
    implementation("ai.whylabs:whylogs-java-core:0.1.4-b6")

    // dataservice
    implementation("ai.whylabs.dataservice:data-service-client:0.1-SNAPSHOT")

    // azure
    implementation("com.azure:azure-messaging-eventhubs:5.19.0")
    implementation("com.google.protobuf:protobuf-java-util:3.21.5")
    implementation("io.opentelemetry.proto:opentelemetry-proto:1.0.0-alpha")

    // AWS
    implementation(platform("com.amazonaws:aws-java-sdk-bom:1.12.633"))
    implementation("com.amazonaws:aws-java-sdk-s3")
    implementation("com.amazonaws:aws-java-sdk-sqs")
    implementation("com.amazonaws:aws-java-sdk-sts")
    implementation("com.amazonaws:aws-java-sdk-dynamodb")
    implementation("com.amazonaws:aws-java-sdk-marketplaceentitlement")
    implementation("com.amazonaws:aws-java-sdk-marketplacemeteringservice")
    implementation("com.amazonaws:aws-java-sdk-cloudwatchmetrics")
    implementation("com.amazonaws:aws-java-sdk-secretsmanager")
    implementation("com.amazonaws:aws-java-sdk-cloudfront")
    implementation("com.amazonaws:amazon-kinesis-client:1.14.1")

    implementation(platform("software.amazon.awssdk:bom:2.22.13"))
    implementation("software.amazon.awssdk:auth")
    implementation("software.amazon.awssdk:sso")
    implementation("software.amazon.awssdk:sts")
    implementation("javax.xml.bind:jaxb-api:2.2.4")

    implementation("com.google.guava:guava:30.0-jre")

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.11.+")
    // SECURITY: https://github.com/advisories/GHSA-xmc8-26q4-qjhx
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-cbor:2.11.4")

    // Elastic Search
    implementation("org.opensearch.client:opensearch-rest-high-level-client:2.2.0")

    // Elastic Cache
    implementation("redis.clients:jedis:5.0.0")
    implementation("com.bucket4j:bucket4j-redis:8.7.0")

    // SECURITY: https://security.snyk.io/vuln/SNYK-JAVA-COMGOOGLECODEGSON-1730327
    implementation("com.google.code.gson:gson:2.8.9")

    // annotations
    implementation("javax.annotation:javax.annotation-api")
    implementation("jakarta.inject:jakarta.inject-api")

    // config
    implementation("io.github.cdimascio:dotenv-kotlin:6.2.1")

    // json-kotlin-schema
    implementation("net.pwall.json:json-kotlin-schema:0.40")

    // json-path
    implementation("com.jayway.jsonpath:json-path:2.8.0")

    // jwt
    implementation("com.nimbusds:nimbus-jose-jwt:9.37.3")

    // launchdarkly
    implementation("com.launchdarkly:launchdarkly-java-server-sdk:7.0.0")

    // stripe
    implementation("com.stripe:stripe-java:24.0.0")

    // GCP pubsub
    implementation(platform("com.google.cloud:libraries-bom:26.1.0"))
    implementation("com.google.cloud:google-cloud-pubsub")
    implementation("com.google.cloud:google-cloud-bigquery:2.1.4")

    // apache commons validation
    implementation("commons-validator:commons-validator:1.7")

    // apache commons csv
    implementation("org.apache.commons:commons-csv:1.10.0")

    kapt("io.micronaut.security:micronaut-security-annotations")
    kapt("io.micronaut.openapi:micronaut-openapi")
    annotationProcessor("io.micronaut:micronaut-inject-java:$micronautVersion")

    implementation("com.squareup.okhttp3:okhttp:4.10.0")
    implementation("com.michael-bull.kotlin-retry:kotlin-retry:1.0.9")
    implementation("com.edmunds:databricks-rest-client:3.3.3")
    runtimeOnly("org.apache.logging.log4j:log4j-slf4j-impl:2.20.0")
    runtimeOnly("org.apache.logging.log4j:log4j-jcl:2.20.0")
    runtimeOnly("org.apache.logging.log4j:log4j-layout-template-json:2.20.0")
    implementation("org.apache.logging.log4j:log4j-api:2.20.0")
    implementation("org.apache.logging.log4j:log4j-api-kotlin:1.2.0")

    // testing
    kaptTest(platform("io.micronaut:micronaut-bom:$micronautVersion"))
    testImplementation("org.junit.jupiter:junit-jupiter-api")
    testImplementation("io.micronaut.test:micronaut-test-junit5")
    testImplementation("io.mockk:mockk:{version}")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine")
    testImplementation("io.kotest:kotest-runner-junit5:4.3.1") // for kotest framework
    testImplementation("io.kotest:kotest-assertions-core:4.3.1") // for kotest core jvm assertions
    testImplementation("io.kotest:kotest-property:4.3.1") // for kotest property test

    if (System.getProperty("os.name").toLowerCase().contains("mac")) {
        implementation("io.micronaut:micronaut-runtime-osx")
    }
}

application {
    mainClass.set("ai.whylabs.songbird.Application")
}

configurations {
    runtimeClasspath {
        resolutionStrategy.force("io.projectreactor:reactor-core:3.5.11")
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

tasks.test {
    useJUnitPlatform()
}

allOpen {
    annotation("io.micronaut.aop.Around")
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "1.8"
    kotlinOptions.javaParameters = true
    kotlinOptions.allWarningsAsErrors = true
}

tasks.named<ShadowJar>("shadowJar") {
    mergeServiceFiles()
}

tasks.shadowJar {
    isZip64 = true
}

tasks.create("develop", JavaExec::class) {
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("ai.whylabs.songbird.Application")
    debug = true

    debugOptions {
        port.set(5005)
        server.set(true)
        suspend.set(false)
    }
}

tasks {
    compileKotlin {
        kotlinOptions.allWarningsAsErrors = false

        kotlinOptions {
            jvmTarget = "11"
        }
    }
    compileTestKotlin {
        kotlinOptions {
            jvmTarget = "11"
        }
    }
}

jacoco {
    toolVersion = "0.8.8"
//    reportsDirectory.set(layout.buildDirectory.dir("customJacocoReportDir"))
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            element = "PACKAGE"
            includes = listOf("ai.whylabs.songbird")
            limit {
                // TODO: improve code coverage
                minimum = "0.2".toBigDecimal()
            }
        }
    }
}

tasks.jacocoTestReport {
    reports {
        xml.isEnabled = true
        xml.destination = layout.buildDirectory.file("jacoco/jacoco.xml").get().asFile
        csv.isEnabled = false
        html.destination = layout.buildDirectory.dir("jacocoHtml").get().asFile
    }
}

tasks.test {
    finalizedBy(tasks.jacocoTestReport) // report is always generated after tests run
}
tasks.jacocoTestReport {
    dependsOn(tasks.test) // tests are required to run before generating the report
}
