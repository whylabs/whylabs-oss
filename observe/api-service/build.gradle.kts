import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator.Feature
import org.openapitools.generator.gradle.plugin.tasks.GenerateTask
import org.openapitools.openapistylevalidator.ValidatorParameters.NamingConvention
import org.openapitools.openapistylevalidator.gradle.OpenAPIStyleValidatorTask

repositories {
    mavenCentral()
}

plugins {
    kotlin("jvm") version "1.6.20"
    id("org.jetbrains.kotlin.kapt") version "1.6.20"
    id("org.jlleitschuh.gradle.ktlint") version "10.2.1"
    id("org.jlleitschuh.gradle.ktlint-idea") version "10.2.1"
    id("org.jetbrains.kotlin.plugin.allopen") version "1.6.20"
    idea
}

apply {
    plugin("java")
    plugin("org.openapi.generator")
    plugin("org.openapitools.openapistylevalidator")
}

version = "0.1"
group = "ai.whylabs.songbird"

buildscript {
    repositories {
        mavenCentral()
        maven {
            url = uri("https://plugins.gradle.org/m2/")
        }
    }

    dependencies {
        classpath("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.11.3")
        classpath("org.openapitools:openapi-generator-gradle-plugin:5.3.1")
        classpath("org.openapitools.openapistylevalidator:openapi-style-validator-gradle-plugin:1.4")
    }
}
val tmpDir = "$buildDir/tmp"
file(tmpDir).mkdirs()

// have these paths as static path
val internalApiSpecs = "$tmpDir/internal-api.yml"
val publicApiSpecs = "$tmpDir/public-api.yml"

val copyInternalApi = tasks.create("copyInternalApi", DefaultTask::class) {
    dependsOn(":service:classes")

    doLast {
        val yaml = findProject("service")!!.buildDir.resolve("tmp")
            .walkTopDown().asIterable()
            .first { f ->
                f.name.endsWith(".yml")
            }

        yaml.copyTo(file(internalApiSpecs), overwrite = true)
    }
}

val validateInternalApi = tasks.create("validateInternalApi", OpenAPIStyleValidatorTask::class) {
    dependsOn(copyInternalApi)

    configureValidation()

    setInputFile(internalApiSpecs)
}

tasks["build"]!!.finalizedBy(validateInternalApi)

/**
 * We use Java client to validate that the OpenAPI specifications are valid. Since Java is a statically typed
 * language, any misconfigurations are detected at compile time.
 *
 * Here we basically generates a Java client and call its own gradle build via subprocessing
 */

val publicApiStyleValidator = tasks.create("validatePublicApi", OpenAPIStyleValidatorTask::class) {
    configureValidation()

    setInputFile(publicApiSpecs)
}

val generateKotlinClient = tasks.create("generateKotlinClient", GenerateTask::class) {
    dependsOn(copyInternalApi)

    // OpenAPI gradle configuration
    generatorName.set("kotlin")
    inputSpec.set(internalApiSpecs)
    globalProperties.set(mapOf("packageName" to "ai.whylabs.songbird.client"))
    outputDir.set("${rootProject.projectDir}/client")
    groupId.set("ai.whylabs.songbird")
    httpUserAgent.set("songbird-client/1.0/kotlin")
    // see: https://openapi-generator.tech/docs/generators/kotlin
    configOptions.set(
        mapOf(
            "artifactId" to "songbird-client",
            "artifactDescription" to "Songbird client API",
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
    packageName.set("ai.whylabs.songbird.client")
    invokerPackage.set("ai.whylabs.songbird.client.invoker")
    modelPackage.set("ai.whylabs.songbird.client.model")
    apiPackage.set("ai.whylabs.songbird.client.api")
    generateModelDocumentation.set(true)
    skipOverwrite.set(false)

    // force build the client
    finalizedBy(":client:build")
}

// we need the service build to succeed first
tasks.getByPath(":client:compileTestKotlin").dependsOn(tasks.getByPath("generateKotlinClient"))

// more clients
val generatedClients = "${rootProject.projectDir}/generated"

val generateNodeClient = tasks.create("generateNodeClient", GenerateTask::class) {
    dependsOn(copyInternalApi)

    // bump this version if there's a major API change
    val majorMinorVersion = "0.1"

    // OpenAPI gradle configuration
    generatorName.set("typescript-axios")
    inputSpec.set(internalApiSpecs)
    outputDir.set("$generatedClients/node/")
    httpUserAgent.set("songbird-node-client/1.0/typescript")
    // see: https://openapi-generator.tech/docs/generators/typescript-node
    configOptions.set(
        mapOf(
            "withInterfaces" to "true",
            "npmName" to "@whylabs/songbird-node-client",
            "npmVersion" to "$majorMinorVersion.0",
            "supportsES6" to "true"
        )
    )
    generateModelDocumentation.set(true)

    doLast {
        // project ID from https://gitlab.com/whylabs/core/songbird-node-client/edit
        val nodeClientProjectId = 22242609

        val tmpDir = "${project.buildDir}/tmp/songbird-client"
        val result = project.exec {
            commandLine = "git clone --depth 1 git@gitlab.com:whylabs/core/songbird-node-client.git $tmpDir".split(' ')
        }

        val mapper = ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT)

        var currentPathVersion = 0
        if (result.exitValue != 0) {
            logger.error("Failed to clone songbird client. We cannot infer current version")
        } else {
            file("$tmpDir/package.json").inputStream().use {
                val pkg = mapper.reader().readTree(it)
                val version = pkg.get("version").asText()
                currentPathVersion = version.split('.')[2].toInt()
            }
        }
        val pkgJson = file("generated/node/package.json")
        val tmp = createTempFile("pkg", ".json", temporaryDir)
        pkgJson.inputStream().use {
            val pkg = mapper.reader().readTree(it).deepCopy<ObjectNode>()
            val newVersionString = "$majorMinorVersion.${currentPathVersion + 1}"
            pkg.put("version", newVersionString)
            val nodeFactory = mapper.nodeFactory
            val pubConfig = nodeFactory.objectNode()
                .put("@whylabs:registry", "https://gitlab.com/api/v4/projects/$nodeClientProjectId/packages/npm/")
            pkg.set<ObjectNode>("publishConfig", pubConfig)
            pkg.set<ObjectNode>("files", mapper.valueToTree(listOf("dist/")))

            mapper.writeValue(tmp, pkg)
        }

        logger.info("Copy content from $tmp to $pkgJson")
        file(tmp).copyTo(pkgJson, overwrite = true)

        file(tmpDir).deleteRecursively()
    }
}

val copyPythonScript = tasks.register<Copy>("copyPythonScript") {
    // we have our additional helper script to add to the package
    from("scripts/python")
    include("**/*.py")
    into("$generatedClients/python/")
}

val generatePythonClient = tasks.create("generatePythonClient", GenerateTask::class) {
    dependsOn(copyInternalApi)

    val pythonClientPath = "$generatedClients/python/"
    val pkgName = "songbird_client"
    val pkgVersion = project.version.toString()

    // OpenAPI gradle configuration
    generatorName.set("python")
    inputSpec.set(internalApiSpecs)
    outputDir.set(pythonClientPath)
    packageName.set(pkgName)
    httpUserAgent.set("$pkgName/$pkgVersion/python")
    // see: https://openapi-generator.tech/docs/generators/python
    configOptions.set(
        mapOf(
            "packageVersion" to pkgVersion,
            "projectName" to "songbird-client"
        )
    )
    generateModelDocumentation.set(true)

    finalizedBy(copyPythonScript)

    doLast {
        val tmpDir = "${project.buildDir}/tmp/songbird-python-client"
        val result = project.exec {
            commandLine =
                "git clone --depth 1 git@gitlab.com:whylabs/core/songbird-python-client.git $tmpDir".split(' ')
        }
        if (result.exitValue != 0) {
            error("Failed to clone songbird client. We cannot infer current version")
        }

        val versionRegex = Regex("([0-9]+)\\.([0-9]+)(?:\\.([0-9]+))?")
        val newVersionString = file("$tmpDir/setup.py").readLines()
            .find { it.startsWith("VERSION = ") }
            ?.let {
                versionRegex.find(it)
            }?.let {
                val (major, minor, patch: String) = it.destructured
                val nextPatchNumber = if (patch.isBlank()) 0 else patch.toInt() + 1
                "$major.$minor.$nextPatchNumber"
            } ?: error("Unable to find version string in setup.py")

        val generatedSetupPy = "$pythonClientPath/setup.py"
        val newSetupPyContent = file(generatedSetupPy).readLines().map {
            if (it.startsWith("VERSION = ")) {
                """VERSION = "$newVersionString""""
            } else {
                it
            }
        }

        logger.info("Update $generatedSetupPy")
        file(generatedSetupPy).bufferedWriter().use { writer ->
            newSetupPyContent.forEach {
                print(it)
                writer.write(it)
                writer.write("\n")
            }
        }

        file(tmpDir).deleteRecursively()

        // __init__.py is missing for the "model" subpackage
        val modelsModule = file(pythonClientPath).resolve(pkgName).resolve("model")
        modelsModule.resolve("__init__.py").createNewFile()
    }
}

val generateJavaClient = tasks.create("generateJavaClient", GenerateTask::class) {
    val generatedPath = "$generatedClients/java"

    dependsOn(copyInternalApi)

    // OpenAPI gradle configuration
    generatorName.set("java")
    inputSpec.set(internalApiSpecs)
    globalProperties.set(mapOf("packageName" to "ai.whylabs.songbird"))
    outputDir.set(generatedPath)
    groupId.set("ai.whylabs")
    version.set("0.1-SNAPSHOT")
    httpUserAgent.set("whylabs-service-api/1.0/java")
    // see: https://openapi-generator.tech/docs/generators/java
    configOptions.set(
        mapOf(
            "artifactId" to "songbird-client",
            "artifactDescription" to "WhyLabs API client",
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
    packageName.set("ai.whylabs.songbird")
    invokerPackage.set("ai.whylabs.songbird.invoker")
    modelPackage.set("ai.whylabs.songbird.model")
    apiPackage.set("ai.whylabs.songbird.api")
    generateModelDocumentation.set(true)
    skipOverwrite.set(false)

    // add logic for publishing to our maven repo
    doLast {
        val file = file("$generatedPath/build.gradle")
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
            // songbird-java-client project id is 22420498
            url "https://gitlab.com/api/v4/projects/22420498/packages/maven"
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

fun OpenAPIStyleValidatorTask.configureValidation() {
    setValidateInfoDescription(true)
    setValidateInfoLicense(true)
    setValidateInfoContact(true)

    // operations
    setValidateOperationDescription(true)
    setValidateOperationSummary(true)
    setValidateOperationOperationId(true)
    setValidateOperationTag(true)

    // model
    setValidateModelPropertiesExample(false)

    // convention
    setPathNamingConvention(NamingConvention.HyphenCase)
    setParameterNamingConvention(NamingConvention.UnderscoreCase)
    setPropertyNamingConvention(NamingConvention.CamelCase)
}

/**
 * Generate OpenAPI definition for public consumption
 * We filter out
 */
tasks.register("generatePublicOpenApi") {
    dependsOn(copyInternalApi)
    finalizedBy(publicApiStyleValidator)

    doLast {
        val mapper = ObjectMapper(YAMLFactory().disable(Feature.WRITE_DOC_START_MARKER))

        file(internalApiSpecs).inputStream().use {
            val openApiDoc = mapper.reader().readTree(it).deepCopy<ObjectNode>()
            val info = openApiDoc["info"].deepCopy<ObjectNode>()
            info.put("title", "WhyLabs API client")
            openApiDoc.replace("info", info)

            val paths = openApiDoc.get("paths").deepCopy<ObjectNode>()
            // extract the list of internal API paths (tagged with "internal")
            val removalCandidates = mutableListOf<String>()
            for ((p, path) in paths.fields()) {
                val copyOfPath = path.deepCopy<ObjectNode>()
                var verbsRemoved = 0
                for ((v, verb) in path.fields()) {
                    for (tag in verb.get("tags")) {
                        if ("internal".equals(tag.asText(), ignoreCase = true)) {
                            copyOfPath.remove(v)
                            verbsRemoved++
                        }
                    }
                }
                if (verbsRemoved == path.size()) {
                    // all verbs removed
                    removalCandidates.add(p)
                }
                paths.replace(p, copyOfPath)
            }
            for (p in removalCandidates) {
                // remove paths that have no verbs
                paths.remove(p)
            }
            openApiDoc.replace("paths", paths)

            // extract list of internal Schema (has "internal" field)
            val components = openApiDoc.get("components").deepCopy<ObjectNode>()
            val schemas = components.get("schemas").deepCopy<ObjectNode>()
            val internalSchemas = mutableListOf<String>()
            for (s in schemas.fieldNames()) {
                val hasInternal = !schemas.at("/$s/properties/internal").isMissingNode
                if (hasInternal) {
                    internalSchemas.add(s)
                    println(s)
                }
            }

            for (n in internalSchemas) {
                schemas.remove(n)
            }
            components.replace("schemas", schemas)
            openApiDoc.replace("components", components)

            println("Done")
            mapper.writeValue(file(publicApiSpecs), openApiDoc)
        }
    }
}

/**
 * This is for generating an external client and thus the metadata is different
 */
val generatePublicJavaClient = tasks.create("generatePublicJavaClient", GenerateTask::class) {
    dependsOn("generatePublicOpenApi")

    // OpenAPI gradle configuration
    generatorName.set("java")
    inputSpec.set(publicApiSpecs)
    globalProperties.set(mapOf("packageName" to "ai.whylabs"))
    outputDir.set("$generatedClients/public-java/")
    groupId.set("ai.whylabs")
    httpUserAgent.set("whylabs-service-api/1.0/java")
    // see: https://openapi-generator.tech/docs/generators/java
    configOptions.set(
        mapOf(
            "artifactId" to "whylabs-api-client",
            "artifactDescription" to "WhyLabs API client",
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
    packageName.set("ai.whylabs.service")
    invokerPackage.set("ai.whylabs.service.invoker")
    modelPackage.set("ai.whylabs.service.model")
    apiPackage.set("ai.whylabs.service.api")
    generateModelDocumentation.set(true)
    skipOverwrite.set(false)
}

val generatePublicPythonClient = tasks.create("generatePublicPythonClient", GenerateTask::class) {
    dependsOn("generatePublicOpenApi")

    // OpenAPI gradle configuration
    generatorName.set("python")
    inputSpec.set(publicApiSpecs)
    outputDir.set("$generatedClients/public-python/")
    packageName.set("whylabs_client")
    httpUserAgent.set("whylabs-client/1.0/python")
    // see: https://openapi-generator.tech/docs/generators/python
    configOptions.set(
        mapOf(
            "packageVersion" to "0.6.16",
            "projectName" to "whylabs-client"
        )
    )
    generateApiTests.set(false)
    generateModelTests.set(false)
    generateModelDocumentation.set(true)
    skipOverwrite.set(false)

    doLast {
        val tmpDir = "$generatedClients/public-python"
        val result = project.exec {
            commandLine = "scripts/update_docs.sh $tmpDir".split(' ')
        }
        if (result.exitValue != 0) {
            error("Failed scripts to update public python client docs")
        }
    }
}

// Define configuration so subprojects can declare dependencies
val generatedClient by configurations.creating {
    isCanBeConsumed = true
    isCanBeResolved = false
    // If you want this configuration to share the same dependencies, otherwise omit this line
    extendsFrom(configurations["implementation"], configurations["runtimeOnly"])
}

artifacts {
    add("generatedClient", generateKotlinClient.outputDir) {
        builtBy(generateKotlinClient)
    }
}
