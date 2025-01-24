import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar

plugins {
    `java-library`
    id("com.github.johnrengelman.shadow") version ("7.1.2")
}

group = rootProject.group
version = rootProject.version
val scalaVersion = project.property("scalaVersion") as String
val deltaVersion = project.property("deltalake") as String

dependencies {
    // we only depends on the output of the whylogs-spark components
    // we don't want to pull in Spark dependencies here
    implementation(project(":murmuration-core"))
    implementation(project(":murmuration", "jar"))
    implementation("io.delta:delta-core_${scalaVersion}:${deltaVersion}")
}

// Do not build the jar for this package
tasks.jar {
    enabled = false
}

val shadowJar: ShadowJar by tasks
shadowJar.apply {
    isZip64 = true
    duplicatesStrategy = DuplicatesStrategy.FAIL

    // Bring in org.apache.spark.sql.sources.DataSourceRegister to enable deltalake in spark sql
    mergeServiceFiles()
    dependsOn(":murmuration:build")

    exclude("*.properties")

    dependencies {
        // double load logging jars is always a headache
        exclude(dependency("org.slf4j:slf4j-api"))
        exclude(dependency("org.scala-lang:.*:.*"))
        exclude("org.apache.logging.log4j:.*:.*")
        // javax mismatch also causes headache
        exclude(dependency("javax.annotation:javax.annotation-api"))
    }
    // relocate core libraries
    relocate("com.google", "com.murmuration.com.google")
    relocate("org.checkerframework", "com.murmuration.org.checkerframework")

    relocate("software.amazon.awssdk", "com.shaded.software.amazon.awssdk")

    // EMR distribution contains mismatched okhttp client
    //    [hadoop@ip-172-31-43-210 ~]$ ls /usr/lib/spark/jars | fgrep ok
    //    okhttp-2.7.5.jar
    //    okhttp-3.12.6.jar
    //    okio-1.15.0.jar
    relocate("okhttp3", "com.shaded.whylabs.okhttp3")
    relocate("okio", "com.shaded.whylabs.okio")
//    relocate("io.delta", "com.shaded.io.delta")
//    relocate("org.apache.spark.sql.delta", "com.shaded.org.apache.spark.sql.delta")


    val commitShortSha = System.getenv("CI_COMMIT_SHORT_SHA") ?: "UNKNOWN"
    archiveFileName.set("${project.name}-${commitShortSha}.jar")
}

tasks.build {
    dependsOn(shadowJar)
}



