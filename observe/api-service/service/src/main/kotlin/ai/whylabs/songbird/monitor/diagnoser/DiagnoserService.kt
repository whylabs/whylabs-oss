package ai.whylabs.songbird.monitor.diagnoser

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.dataservice.RetryInterceptor
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.NotImplementedException
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.v0.models.Segment
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Singleton
import okhttp3.ConnectionPool
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class DiagnoserErrorBody(
    val detail: String?
)

@Singleton
class DiagnoserService(
    config: EnvironmentConfig,
) : JsonLogging {
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .connectionPool(ConnectionPool(10, 3, TimeUnit.MINUTES))
        .addInterceptor(RetryInterceptor())
        .build()
    private val baseUrl: String? = config.getDiagnoserServiceEndpoint()
    private val gson: Gson = Gson()

    fun <T> executeRequest(diagnoserRequest: Request, responseClass: Class<T>, requestName: String): T {
        val notImplException = NotImplementedException("$requestName is coming soon")
        httpClient.newCall(diagnoserRequest).execute().use { response ->
            val bodyString = response.body?.string()
            if (!response.isSuccessful) {
                if (response.code == 501) {
                    throw notImplException
                }
                if (response.code == 400) {
                    // extract the error message that should be in the response body
                    val body = gson.fromJson(bodyString, DiagnoserErrorBody::class.java)
                    throw IllegalArgumentException(body?.detail ?: response.message)
                }
                if (response.code == 404) {
                    val body = gson.fromJson(bodyString, DiagnoserErrorBody::class.java)
                    throw ResourceNotFoundException(body?.detail ?: response.message)
                }
                throw IllegalStateException("Failed to execute $requestName: ${response.code} $bodyString")
            }
            return try {
                gson.fromJson(bodyString, responseClass)
            } catch (e: JsonSyntaxException) {
                throw InternalError("Unable to parse response for $requestName: ${e.message}")
            }
        }
    }

    fun diagnose(request: DiagnoserDiagnosisRequest, apiKey: String): DiagnosisReport {
        val body = gson.toJson(request).toRequestBody(null)
        val diagnoserRequest = Request.Builder()
            .url("$baseUrl/diagnose/sync")
            .addHeader("content-type", "application/json")
            .addHeader("accept-type", "application/json")
            .addHeader("x-api-key", apiKey)
            .post(body)
            .build()
        return executeRequest(diagnoserRequest, DiagnosisReport::class.java, "diagnose")
    }

    fun diagnoseAsync(request: DiagnoserDiagnosisRequest, apiKey: String): AsyncDiagnosisResponse {
        val body = gson.toJson(request).toRequestBody(null)
        val diagnoserRequest = Request.Builder()
            .url("$baseUrl/diagnose/async")
            .addHeader("content-type", "application/json")
            .addHeader("accept-type", "application/json")
            .addHeader("x-api-key", apiKey)
            .post(body)
            .build()
        return executeRequest(diagnoserRequest, AsyncDiagnosisResponse::class.java, "diagnose async")
    }

    fun diagnosisAsyncResult(request: DiagnoserAsyncResultRequest): AsyncDiagnosisResultResponse {
        val body = gson.toJson(request).toRequestBody(null)
        val diagnoserRequest = Request.Builder()
            .url("$baseUrl/diagnose/async/result")
            .addHeader("content-type", "application/json")
            .addHeader("accept-type", "application/json")
            .post(body)
            .build()
        return executeRequest(diagnoserRequest, AsyncDiagnosisResultResponse::class.java, "diagnosis async result")
    }
}

data class DiagnoserDiagnosisRequest(
    val orgId: String,
    val datasetId: String,
    val analyzerId: String,
    val segment: Segment,
    val columns: List<String>,
    val interval: String
)

data class AsyncDiagnosisResponse(
    val diagnosisId: String
)

data class DiagnoserAsyncResultRequest(
    val orgId: String,
    val diagnosisId: String
)

enum class DiagnosisRequestStatus {
    PENDING,
    COMPLETE,
    FAILED
}
data class AsyncDiagnosisResultResponse(
    val status: DiagnosisRequestStatus,
    @field:Schema(nullable = false) // incorrect but needed to generate the python client with a proper type
    val report: DiagnosisReport? = null,
    val errorDetails: String? = null
)
