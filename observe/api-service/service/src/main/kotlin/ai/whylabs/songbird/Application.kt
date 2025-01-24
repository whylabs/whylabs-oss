package ai.whylabs.songbird

import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.ApiKeyHeader
import io.micronaut.runtime.Micronaut
import io.swagger.v3.oas.annotations.OpenAPIDefinition
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType
import io.swagger.v3.oas.annotations.info.Contact
import io.swagger.v3.oas.annotations.info.Info
import io.swagger.v3.oas.annotations.info.License
import io.swagger.v3.oas.annotations.security.SecurityScheme
import org.slf4j.LoggerFactory
import java.nio.file.Files
import java.nio.file.Paths

@OpenAPIDefinition(
    info = Info(
        title = "WhyLabs Songbird",
        version = "0.1",
        description = "WhyLabs API that enables end-to-end AI observability",
        license = License(name = "Apache License 2.0", url = "https://www.apache.org/licenses/LICENSE-2.0"),
        contact = Contact(name = "WhyLabs", email = "support@whylabs.ai", url = "https://whylabs.ai"),
        termsOfService = "https://whylabs.ai/terms-of-use"
    ),
    // Unfortunately we can't hardcode our endpoint here. Uncomment for generating the public client
    // servers = [
    //     Server(url = "https://api.whylabsapp.com", description = "WhyLabs main endpoint"),
    // ]
)
@SecurityScheme(
    name = ApiKeyAuth,
    type = SecuritySchemeType.APIKEY,
    paramName = ApiKeyHeader,
    `in` = SecuritySchemeIn.HEADER
)
object Application {
    private val logger = LoggerFactory.getLogger(javaClass)

    @JvmStatic
    fun main(args: Array<String>) {
        val stage = System.getenv(EnvironmentVariable.Stage.name)
        if (stage != null && !stage.equals(Stage.Personal.name, ignoreCase = true)) {
            val cwNamespace = if (stage.equals(Stage.Production.name, ignoreCase = true)) {
                "songbird-aws"
            } else {
                "${stage.replaceFirstChar { it.uppercaseChar() }}-songbird-aws"
            }

            // See: https://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/generating-sdk-metrics.html
            logger.info("Publishing AWS SDK metrics to Cloudwatch: {}", cwNamespace)
            System.setProperty("com.amazonaws.sdk.enableDefaultMetrics", "metricNameSpace=$cwNamespace")
        }
        Files.createDirectories(Paths.get("/tmp/songbird"))
        Micronaut.build()
            .eagerInitSingletons(false)
            .packages(javaClass.`package`.name)
            .mainClass(Application.javaClass)
            .start()
    }
}
