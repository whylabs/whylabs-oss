import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar

plugins {
    `java-library`
    id("com.github.johnrengelman.shadow") version ("6.1.0")
}

group = rootProject.group
version = rootProject.version
val scalaVersion = project.property("scalaVersion") as String
val sparkVersion = project.property("sparkVersion") as String


dependencies {
    // we only depends on the output of the whylogs-spark components
    // we don't want to pull in Spark dependencies here
    implementation(project(":murmuration-core"))
    implementation(project(":murmuration", "jar"))

    //implementation(scalaPackage("org.apache.spark", "spark-core", sparkVersion))
    /*implementation(scalaPackage("org.apache.spark", "spark-sql", sparkVersion)) {
        exclude("org.apache.spark:spark-catalyst.*:.*")
        exclude("org.apache.spark:spark-sketch.*:.*")
    }*/
    //implementation(scalaPackage("org.apache.spark", "spark-mllib", sparkVersion))

}

fun scalaPackage(groupId: String, name: String, version: String) =
        "$groupId:${name}_$scalaVersion:$version"

// Do not build the jar for this package
tasks.jar {
    enabled = false
}
val shadowJar: ShadowJar by tasks

shadowJar.apply {
    isZip64 = true
    // Bring in org.apache.spark.sql.sources.DataSourceRegister to enable deltalake in spark sql
    mergeServiceFiles()
    dependsOn(":murmuration:build")

    exclude("*.properties")

    dependencies {
        exclude(dependency("org.apache.spark:.*:.*"))


        // Default to netty client, can't have both on classpath
        //exclude(dependency("software.amazon.awssdk:apache-client:.*"))
        exclude(dependency("org.apache.hadoop:.*:.*"))
        exclude(dependency("io.delta:.*:.*"))
        exclude(dependency("io.airlift:.*:.*"))
        exclude(dependency("org.apache.kafka:.*:.*"))
        exclude(dependency("org.hibernate:.*:.*"))
        exclude(dependency("org.junit:.*:.*"))
        exclude(dependency("com.amazonaws:amazon-kinesis-producer:.*"))
        exclude(dependency("com.ibm.icu:.*:.*"))
        exclude(dependency("it.unimi.dsi:fastutil:.*"))
        exclude(dependency("org.hyperic:sigar:.*"))
        exclude(dependency("software.amazon.awssdk:glue:.*"))
        exclude(dependency("software.amazon.awssdk:dynamodb:.*"))
        exclude(dependency("software.amazon.awssdk:cloudwatch:.*"))
        exclude(dependency("com.amazonaws:aws-java-sdk-kinesisfirehose:.*"))
        exclude(dependency("com.amazonaws:aws-java-sdk-kinesisanalytics:.*"))
        exclude(dependency("org.apache.zookeeper:.*:.*"))
        exclude(dependency("org.apache.htrace:.*:.*"))
        exclude(dependency("org.apache.ivy:.*:.*"))
        exclude(dependency("org.apache.xerces:.*:.*"))
        exclude(dependency("org.apache.directory:.*:.*"))
        exclude(dependency("org.apache.curator:.*:.*"))
        exclude(dependency("org.apache.commons:compress:.*"))
        exclude(dependency("org.apache.commons:beanutils:.*"))
        exclude(dependency("org.apache.commons:text:.*"))
        exclude(dependency("org.apache.commons:digester:.*"))
        exclude(dependency("org.apache.commons:cli:.*"))
        exclude(dependency("org.scalanlp:breeze.*:.*"))
        exclude(dependency("org.spire-math:spire.*:.*"))
        exclude(dependency("org.typelevel:spire.*:.*"))
        exclude(dependency("org.apache.spark:spark-catalyst.*:.*"))
        exclude(dependency("org.apache.spark:spark-execution.*:.*"))
        exclude(dependency("org.jetbrains.kotlin:kotlin-reflect:.*"))



        exclude ("test/**")
        exclude ("src/test/**")

        // double load logging jars is always a headache

        //exclude(dependency("org.scala-lang:.*:.*"))
        // javax mismatch also causes headache
        exclude(dependency("javax.annotation:javax.annotation-api"))
    }


    // relocate core libraries
    relocate("org.apache.datasketches", "com.shaded.whylabs.org.apache.datasketches")
    relocate("com.google", "com.shaded.whylabs.com.google")
    relocate("org.checkerframework", "com.shaded.whylabs.org.checkerframework")

    // EMR distribution contains mismatched okhttp client
    //    [hadoop@ip-172-31-43-210 ~]$ ls /usr/lib/spark/jars | fgrep ok
    //    okhttp-2.7.5.jar
    //    okhttp-3.12.6.jar
    //    okio-1.15.0.jar
    relocate("okhttp3", "com.shaded.whylabs.okhttp3")
    relocate("okio", "com.shaded.whylabs.okio")


    val commitShortSha = System.getenv("CI_COMMIT_SHORT_SHA") ?: "UNKNOWN"
    archiveFileName.set("${project.name}-${commitShortSha}.jar")
}

tasks.build {
    dependsOn(shadowJar)
}


