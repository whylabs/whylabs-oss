package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.cache.EmbeddingTextCache
import ai.whylabs.songbird.embeddings.EmbeddingAssetProcessor
import ai.whylabs.songbird.embeddings.EmbeddingAssetUpdateJob
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.toDate
import ai.whylabs.songbird.v0.controllers.Response
import ai.whylabs.songbird.v0.dao.AssetMetadataDAO
import ai.whylabs.songbird.v0.ddb.AssetMetadataItem
import com.amazonaws.HttpMethod
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.model.GeneratePresignedUrlRequest
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import java.text.SimpleDateFormat
import java.time.Duration
import java.time.Instant
import java.util.Date
import kotlin.concurrent.thread

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1")
@Tags(
    Tag(name = "Embeddings", description = "Endpoint for embeddings data"),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class EmbeddingsController(
    private val config: EnvironmentConfig,
    private val s3: AmazonS3,
    private val assetMetadataDAO: AssetMetadataDAO,
    private val embeddingAssetProcessor: EmbeddingAssetProcessor,
    private val embeddingAssetUpdateJob: EmbeddingAssetUpdateJob,
    private val embeddingTextCache: EmbeddingTextCache,
) : JsonLogging {
    @WhyLabsInternal
    @Operation(
        operationId = "GetEmbeddingData",
        summary = "Endpoint to embedding data",
        description = "Endpoint to embedding data",
        tags = ["Internal"],
    )
    @Get(
        uri = "/embeddings/data",
        produces = [MediaType.APPLICATION_JSON],
    )
    fun getEmbeddingData(
        @QueryValue tag: String?,
        @QueryValue version: Int?,
    ): GetEmbeddingDataResponse {
        val bucket = config.getEnv(EnvironmentVariable.StorageBucket)
        val expirationTime = Instant.now().plus(Duration.ofMinutes(15)).toDate()
        val signedUrl = if (!tag.isNullOrBlank() && version != null && s3.doesObjectExist(bucket, "embeddings/processed/$tag/$version/by_dataset.json")) {
            s3.generatePresignedUrl(
                GeneratePresignedUrlRequest(bucket, "embeddings/processed/$tag/$version/by_dataset.json").apply {
                    method = HttpMethod.GET
                    expiration = expirationTime
                }
            ).toString()
        } else {
            val presignedUrlRequest =
                GeneratePresignedUrlRequest(bucket, "embeddings/processed/by_dataset.json").apply {
                    method = HttpMethod.GET
                    expiration = expirationTime
                }
            s3.generatePresignedUrl(presignedUrlRequest).toString()
        }

        return GetEmbeddingDataResponse(url = signedUrl)
    }

    @WhyLabsInternal
    @Operation(
        operationId = "ProcessAllEmbeddingData",
        summary = "Endpoint to process all embedding data",
        description = "Endpoint to process all embedding data",
        tags = ["Internal"],
    )
    @Post(
        uri = "/embeddings/data/all",
        produces = [MediaType.APPLICATION_JSON],
    )
    fun processAllEmbeddingData(
        @QueryValue overwrite: Boolean? = false,
        @QueryValue period_in_seconds: Long? = null,
    ): Response {
        thread {
            embeddingAssetUpdateJob.update(overwrite = overwrite, periodInSeconds = period_in_seconds)
        }

        return Response()
    }

    @WhyLabsInternal
    @Operation(
        operationId = "ProcessEmbeddingData",
        summary = "Endpoint to process embedding data",
        description = "Endpoint to process embedding data",
        tags = ["Internal"],
    )
    @Post(
        uri = "/embeddings/data",
        produces = [MediaType.APPLICATION_JSON],
    )
    fun processEmbeddingData(
        @QueryValue tag: String?,
        @QueryValue version: Int?,
        @QueryValue overwrite: Boolean? = false,
    ): Response {
        thread {
            val queryFilter = mutableMapOf<String, Condition>()
            queryFilter["tag"] = Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withS(tag))
            queryFilter["uploaded"] to Condition()
                .withComparisonOperator(ComparisonOperator.NE)
                .withAttributeValueList(AttributeValue().withBOOL(false))

            assetMetadataDAO.query(
                AssetMetadataItem(orgId = "shared-assets", assetId = "data"),
                version = version,
                queryFilter = queryFilter,
            ).maxByOrNull { it.assetVersion }?.let { it ->
                embeddingAssetProcessor.process(it.tag, it.version, it.s3Uri, overwrite = overwrite ?: false)
            }
        }

        return Response()
    }

    @WhyLabsInternal
    @Operation(
        operationId = "RetrieveEmbeddingText",
        summary = "Endpoint to retrieve embedding text",
        description = "Endpoint to retrieve embedding text",
        tags = ["Internal"],
    )
    @Post(
        uri = "/embeddings/text",
        produces = [MediaType.APPLICATION_JSON],
    )
    fun retrieveEmbeddingText(
        @Body request: GetEmbeddingTextRequest,
    ): GetEmbeddingTextResponse {
        val textList = request.uids.map { uid ->
            embeddingTextCache.getText(uid) ?: ""
        }

        return GetEmbeddingTextResponse(
            uids = request.uids,
            text = textList,
        )
    }

    @WhyLabsInternal
    @Operation(
        operationId = "SubmitFeedback",
        summary = "Endpoint to submit feedback",
        description = "Endpoint to submit feedback from spans",
        tags = ["Internal"],
    )
    @Post(
        uri = "/embeddings/feedback",
        produces = [MediaType.APPLICATION_JSON],
    )
    fun submitFeedback(
        @QueryValue org_id: String,
        @QueryValue dataset_id: String,
        @QueryValue signal: EmbeddingsFeedbackSignal? = EmbeddingsFeedbackSignal.FALSE_POSITIVE,
        @Body request: EmbeddingsFeedbackRequest,
    ) {
        // TODO add embedding_id to the response map and write to s3
        // will be fetched from data-service using the span-id, but need to add a structured layout for the traces
        // which isn't straight forward to be parsed just yet.
        // val traceDetails = dataService.tracesApi.detail(TraceDetailRequest().orgId(org_id).traceId(request.traceId))

        val now = System.currentTimeMillis()
        val date = SimpleDateFormat("yyyy-MM-dd").format(Date())

        val feedbackMap = mapOf(
            "trace_id" to request.traceId,
            "signal" to signal?.value,
            "span_id" to request.spanId,
            "feedback" to request.feedback,
        )

        s3.putObject(
            config.getEnv(EnvironmentVariable.StorageBucket),
            "embeddings/feedback/$org_id/$dataset_id/$date/$now.json",
            jacksonObjectMapper().writeValueAsString(feedbackMap)
        )
    }
}

data class GetEmbeddingTextRequest(
    val uids: List<String> = emptyList(),
)

data class GetEmbeddingTextResponse(
    val uids: List<String>,
    val text: List<String>,
)

data class GetEmbeddingDataResponse(
    val url: String,
)

data class EmbeddingsFeedbackRequest(
    val traceId: String,
    val spanId: String,
    val feedback: String,
)

data class EmbeddingDataEntry(
    val coordinates: List<Double>,
    val text: String?,
    val dataset: String?,
    val id: String?,
    val uid: String?,
)

data class VizEmbeddingDataEntry(
    val text: List<String>?,
    val x: List<Double>,
    val y: List<Double>,
    val z: List<Double>,
    val uid: List<String>?,
)

enum class EmbeddingsFeedbackSignal(val value: String) {
    FALSE_POSITIVE("false_positive"),
    FALSE_NEGATIVE("false_negative"),
    TRUE_POSITIVE("true_positive"),
    TRUE_NEGATIVE("true_negative")
}
