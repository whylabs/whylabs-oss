package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.common.WhyLabsAttributes
import ai.whylabs.songbird.operations.AuditableRequestBody
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.v0.controllers.Response
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/diagnostics")
@Tags(
    Tag(name = "Diagnostics", description = "Endpoint for sending and retrieving WhyLabs diagnostics data."),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class DiagnosticsController @Inject constructor() {
    @AuditableRequestBody
    @Operation(
        operationId = "SendDiagnostics",
        summary = "Send diagnostics data",
        description = "Endpoint to store diagnostics data",
    )
    @Post(
        uri = "/{type}",
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun postDiagnostics(
        type: String,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
        @Body diagnostics: String,
    ): Response {
        if (diagnostics.isEmpty()) {
            throw IllegalArgumentException("Diagnostics data cannot be empty.")
        }

        return Response()
    }
}
