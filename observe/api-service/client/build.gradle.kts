plugins {
    idea
    kotlin("jvm")
}

group = "ai.whylabs.songbird"
version = "1.0.0"

repositories {
    mavenCentral()
    jcenter()
}

val generatedClient by configurations.creating {
    isCanBeConsumed = false
    isCanBeResolved = true
}

val kotlinVersion: String = "1.6.20"

dependencies {
    generatedClient(project(mapOf(
        "path" to ":",
        "configuration" to "generatedClient")))

    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:$kotlinVersion")
    implementation("org.jetbrains.kotlin:kotlin-reflect:$kotlinVersion")
    implementation("com.squareup.moshi:moshi-kotlin:1.13.0")
    implementation("com.squareup.moshi:moshi-adapters:1.13.0")
    implementation("com.squareup.okhttp3:okhttp:4.2.2")

    testImplementation(platform("com.amazonaws:aws-java-sdk-bom:1.12.633"))
    testImplementation("com.amazonaws:aws-java-sdk-s3")
    testImplementation("io.kotlintest:kotlintest-runner-junit5:3.4.2")
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.1.1")
    testImplementation("ai.whylabs:whylogs-java-core:0.1.2-b7")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.1.1")

    testImplementation(platform("software.amazon.awssdk:bom:2.22.13"))
    testImplementation("com.michael-bull.kotlin-retry:kotlin-retry:1.0.8")
    testImplementation("software.amazon.awssdk:auth")
    testImplementation("software.amazon.awssdk:sso")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.1")

    implementation(platform("com.amazonaws:aws-java-sdk-bom:1.12.633"))
    implementation("com.amazonaws:aws-java-sdk-sts")
}

tasks.test {
    // include -Prerun to allow tests to to run multiple times
    outputs.upToDateWhen {
        !project.hasProperty("rerun")
    }
    useJUnitPlatform()
    onlyIf {
        project.hasProperty("integTests")
    }
}

val requiredMinVersion = JavaVersion.VERSION_11
val enforceJavaVersionTask = tasks.create("enforceJavaVersion") {
    val foundVersion = JavaVersion.current()
    if (foundVersion < requiredMinVersion) {
        throw IllegalStateException("Wrong Java version. Required minimum $requiredMinVersion, but found $foundVersion")
    }
}
tasks.compileJava {
    dependsOn(enforceJavaVersionTask)
    dependsOn(generatedClient)
}

tasks.processTestResources {
    dependsOn(generatedClient)
}

tasks.compileKotlin {
    dependsOn(generatedClient)
}
