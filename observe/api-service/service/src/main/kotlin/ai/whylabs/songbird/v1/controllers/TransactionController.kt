package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.common.WhyLabsAttributes
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsFileExtensionHeader
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.getRequestAttribute
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.ValidatedIdentity
import ai.whylabs.songbird.security.getKey
import ai.whylabs.songbird.transaction.TransactionManager
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.controllers.AsyncLogResponse
import ai.whylabs.songbird.v0.controllers.Response
import ai.whylabs.songbird.v0.controllers.WhyLabsFileExtension
import ai.whylabs.songbird.v0.dao.LogTransactionMetadata
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.models.SegmentTag
import io.micrometer.core.lang.Nullable
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Header
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1")
@Tag(name = "Transactions", description = "Endpoint for log transactions")
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class TransactionController(
    private val transactionManager: TransactionManager,
    private val modelDAO: ModelDAO,
) : JsonLogging {

    @Operation(
        operationId = "StartTransaction",
        summary = "Start a log transaction",
        description = "API to start a log transaction",
    )
    @Post(
        uri = "/transaction",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON],
    )
    suspend fun startTransaction(
        @Body body: TransactionStartRequest,
    ): LogTransactionMetadata {
        val orgId = getRequestAttribute(WhyLabsAttributes.RequestOrganizationId).toString()
        val datasetId = body.datasetId
        // Ensure the model exists in the org
        modelDAO.getModel(orgId, datasetId)
        return transactionManager.createTransaction(orgId, datasetId)
    }

    @Operation(
        operationId = "TransactionStatus",
        summary = "Get the status of a log transaction",
        description = "API to get the status of a log transaction",
    )
    @Get(
        uri = "/transaction",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun transactionStatus(
        @QueryValue @Schema(example = DocUtils.ExampleTransactionId) transaction_id: String,
    ): TransactionStatusResponse {
        val orgId = getRequestAttribute(WhyLabsAttributes.RequestOrganizationId).toString()
        return TransactionStatusResponse(
            files = transactionManager.transactionStatus(orgId, transaction_id)
        )
    }

    @Operation(
        operationId = "LogTransaction",
        summary = "Add to a log transaction",
        description = "API to add to a log transaction",
    )
    @Post(
        uri = "/transaction/log",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun logTransaction(
        @QueryValue @Schema(example = DocUtils.ExampleTransactionId) transaction_id: String,
        @Body body: TransactionLogRequest,
        @Schema(hidden = true, required = false)
        @Header(WhyLabsFileExtensionHeader) file_extension: String?,
        @Nullable authentication: Authentication,
    ): AsyncLogResponse {
        val orgId = getRequestAttribute(WhyLabsAttributes.RequestOrganizationId).toString()
        val key: ValidatedIdentity = authentication.getKey()
        val fileType: WhyLabsFileExtension = WhyLabsFileExtension.valueOf(file_extension ?: "BIN")

        return transactionManager.logTransaction(orgId, transaction_id, key.identityId, body, fileExtension = fileType)
    }

    @Operation(
        operationId = "AbortTransaction",
        summary = "Abort a transaction which has not yet been committed",
        description = "Abort a transaction which has not yet been committed",
    )
    @Post(
        uri = "/transaction/abort",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun abortTransaction(
        @QueryValue @Schema(example = DocUtils.ExampleTransactionId) transaction_id: String,
    ): Response {
        val orgId = getRequestAttribute(WhyLabsAttributes.RequestOrganizationId).toString()
        transactionManager.abortTransaction(orgId, transaction_id)
        return Response()
    }

    @Operation(
        operationId = "CommitTransaction",
        summary = "Commit a log transaction",
        description = "API to commit a log transaction",
    )
    @Post(
        uri = "/transaction/commit",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun commitTransaction(
        @QueryValue @Schema(example = DocUtils.ExampleTransactionId) transaction_id: String,
        @Body body: TransactionCommitRequest,
    ): Response {
        val orgId = getRequestAttribute(WhyLabsAttributes.RequestOrganizationId).toString()
        transactionManager.commitTransaction(orgId, transaction_id)
        return Response()
    }
}

@Schema(description = "Request payload for Transaction start.")
data class TransactionStartRequest(
    val datasetId: String,
)
@Schema(description = "Request payload for Transaction log.")
data class TransactionLogRequest(
    val datasetTimestamp: Long,
    val segmentTags: List<SegmentTag>,
    val region: String? = null,
)

@Schema(description = "Request payload for Transaction commit.")
data class TransactionCommitRequest(
    val verbose: Boolean? = false
)

@Schema(description = "Response payload for Transaction status.")
data class TransactionStatusResponse(
    val files: List<String> = listOf(),
)
