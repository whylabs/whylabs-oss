package ai.whylabs.songbird.dataservice

import ai.whylabs.dataservice.api.AdminApi
import ai.whylabs.dataservice.api.AnalysisApi
import ai.whylabs.dataservice.api.BootstrapApi
import ai.whylabs.dataservice.api.BulkApi
import ai.whylabs.dataservice.api.DatasetsApi
import ai.whylabs.dataservice.api.DebugEventApi
import ai.whylabs.dataservice.api.DiagnosticApi
import ai.whylabs.dataservice.api.EntitySchemaApi
import ai.whylabs.dataservice.api.EventsApi
import ai.whylabs.dataservice.api.FeatureWeightsApi
import ai.whylabs.dataservice.api.MetricsApi
import ai.whylabs.dataservice.api.MonitorConfigApi
import ai.whylabs.dataservice.api.NotificationsApi
import ai.whylabs.dataservice.api.OrganizationApi
import ai.whylabs.dataservice.api.ProfileApi
import ai.whylabs.dataservice.api.RenderApi
import ai.whylabs.dataservice.api.TracesApi
import ai.whylabs.dataservice.invoker.ApiClient
import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton
import okhttp3.OkHttpClient

interface DataService {
    val adminApi: AdminApi
    val analysisApi: AnalysisApi
    val boostrapApi: BootstrapApi
    val bulkApi: BulkApi
    val datasetApi: DatasetsApi
    val debugEventApi: DebugEventApi
    val diagnosticApi: DiagnosticApi
    val entitySchemaApi: EntitySchemaApi
    val metricsApi: MetricsApi
    val monitorConfigApi: MonitorConfigApi
    val organizationApi: OrganizationApi
    val profileApi: ProfileApi
    val renderApi: RenderApi
    val featureWeightsApi: FeatureWeightsApi
    val tracesApi: TracesApi
    val eventsApi: EventsApi
    val notificationApi: NotificationsApi
}

@Factory
class DataServiceFactory(
    private val config: EnvironmentConfig,
) : JsonLogging {

    @Singleton
    fun dataService(): DataServiceImpl {
        val endpoint = config.getDataServiceEndpoint()

        val builder = OkHttpClient.Builder()
        val okHttpClient = builder
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .callTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            // usually wouldn't retry on 500, but most data service errors come back as this including retryable ones
            .addInterceptor(RetryInterceptor(RETRYABLE_CODES + 500))
            .build()

        val client = ApiClient(okHttpClient).setBasePath(endpoint)
        return DataServiceImpl(client)
    }
}

class DataServiceImpl(
    client: ApiClient,
) : DataService, JsonLogging {

    override val adminApi = AdminApi(client)
    override val analysisApi = AnalysisApi(client)
    override val boostrapApi = BootstrapApi(client)
    override val bulkApi = BulkApi(client)
    override val datasetApi = DatasetsApi(client)
    override val debugEventApi = DebugEventApi(client)
    override val diagnosticApi = DiagnosticApi(client)
    override val entitySchemaApi = EntitySchemaApi(client)
    override val metricsApi: MetricsApi = MetricsApi(client)
    override val monitorConfigApi = MonitorConfigApi(client)
    override val organizationApi = OrganizationApi(client)
    override val profileApi = ProfileApi(client)
    override val renderApi = RenderApi(client)
    override val featureWeightsApi = FeatureWeightsApi(client)
    override val tracesApi = TracesApi(client)
    override val eventsApi = EventsApi(client)
    override val notificationApi = NotificationsApi(client)
}
