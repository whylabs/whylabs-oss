plugins {
    `java-library`
    jacoco
    idea
    id("com.diffplug.spotless") version "6.22.0"
}

group = "ai.whylabs"
version = "0.1.0-SNAPSHOT"

allprojects {
    buildscript {
        repositories {
            mavenCentral()
        }
    }

    repositories {
        google()
        mavenCentral()

        maven {
            url = uri("https://oss.sonatype.org/content/repositories/snapshots/")
        }
        // Having service issues
        //maven {
        //    url = uri("https://repository.jboss.org/nexus/content/groups/public/")
        //}

        maven {
            url = uri("https://maven.repository.redhat.com/ga/")
        }

        maven {
            name = "Gitlab-Songbird"
            // https://gitlab.com/whylabs/core/songbird-java-client/-/packages
            url = uri("https://gitlab.com/api/v4/projects/22420498/packages/maven")

            credentials(HttpHeaderCredentials::class) {
                // this is the "read-maven-token" token with read-api listed here
                // https://gitlab.com/whylabs/core/songbird-java-client/-/settings/access_tokens
                // this repo is not a secret repo since it's just a wrapper around our REST
                // API. You can construct it via the OpenSwagger API
                name = "Private-Token"
                value = "2sLR7xDsnksNb7Csu3gQ"
            }

            authentication {
                create<HttpHeaderAuthentication>("header")
            }
        }
    }
}

subprojects {
    version = version
    group = group

    apply(plugin = "idea")
    apply(plugin = "java")
    apply(plugin = "com.diffplug.spotless")
    apply(plugin = "jacoco")

    java {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    tasks.withType<JavaCompile>() {
        options.encoding = "UTF-8"
    }

    tasks.test {
        extensions.configure(JacocoTaskExtension::class) {
            setDestinationFile(layout.buildDirectory.file("jacoco/jacocoTest.exec").get().asFile)
            classDumpDir = layout.buildDirectory.dir("jacoco/classpathdumps").get().asFile
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

    spotless {
        java {
            toggleOffOn() //  control formatting with spotless:off/spotless:on
        }
        scala {
            scalafmt()
        }

        java {
            googleJavaFormat("1.18.1")
            removeUnusedImports()
            trimTrailingWhitespace()
            endWithNewline()
            indentWithSpaces()
        }
    }

    tasks.withType<Checkstyle>().configureEach {
        reports {
            xml.isEnabled = false
            html.isEnabled = true
        }
    }


}

tasks.jar {
    enabled = false
}

tasks.compileJava {
    enabled = false
}
