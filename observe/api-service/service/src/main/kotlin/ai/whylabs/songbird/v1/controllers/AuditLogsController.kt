package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.common.WhyLabsAttributes
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.AuditableRequestBody
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.v0.controllers.Response
import ai.whylabs.songbird.v0.dao.AuditLogsDAO
import ai.whylabs.songbird.v1.services.AuditLogsService
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import java.util.Date

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/audit-logs")
@Tag(name = "AuditLogs", description = "Operations related to audit logs")
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class AuditLogsController(
    private val auditLogsDumpService: AuditLogsService,
    private val auditLogsDAO: AuditLogsDAO
) : JsonLogging {
    @Operation(
        operationId = "ExportAuditLogs",
        summary = "Export audit logs",
        description = "Query audit logs from BigQuery and export them to a file on s3",
    )
    @Post("/export")
    @AuditableRequestBody
    fun exportAuditLogs(
        @QueryValue start_date: String,
        @QueryValue end_date: String,
        @Schema(description = "Organization ID", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
    ): Response {

        // this will also run during the query execution, but good to do it here
        // to avoid SQL injection and throw earlier if something's off
        val parsedStartDate = auditLogsDAO.parseDate(start_date, Date(), "start_date")
        val parsedEndDate = auditLogsDAO.parseDate(end_date, Date(), "end_date")

        auditLogsDumpService.dump(
            orgId,
            parsedStartDate,
            parsedEndDate,
            null,
            null,
            null,
            null,
            null,
            null
        )
        log.debug("Started job to dump audit logs for orgId: $orgId")
        return Response()
    }
}
