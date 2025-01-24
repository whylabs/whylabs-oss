package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemRole
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.LocalResource
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/${DocUtils.OrganizationUri}/schema")
@Tag(name = "Schema", description = "Schema management.")
@Secured(WhyLabsSystemRole, AdministratorRole, UserRole)
class SchemaController @Inject constructor() : JsonLogging {

    @Operation(
        operationId = "GetMonitorConfigSchema",
        summary = "Get the current supported schema of the monitor configuration",
        description = "Get the current supported schema of the  monitor configuration",
    )
    @Get(
        uri = "/monitor-config",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun getMonitorConfigSchema(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String
    ): String {
        log.info("Loading monitor schema definition: $org_id")
        return LocalResource.MonitorConfigSchemaJson.asString()
    }
}
