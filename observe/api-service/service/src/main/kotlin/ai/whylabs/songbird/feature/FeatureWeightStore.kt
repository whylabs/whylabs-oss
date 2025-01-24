package ai.whylabs.songbird.feature

import ai.whylabs.dataservice.invoker.ApiException
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.MonitorConfigUpdater
import jakarta.inject.Singleton

@Singleton
class FeatureWeightStore(
    private val dataService: DataService,
    private val monitorConfigUpdater: MonitorConfigUpdater,
) : JsonLogging {

    fun load(orgId: String, datasetId: String): EntityWeightRecord? {
        try {
            val response = dataService.featureWeightsApi.loadFeatureWeights(orgId, datasetId)
            return EntityWeightRecord.fromDataServiceSegmentWeightConfig(response.segmentWeights, response.metadata)
        } catch (e: ApiException) {
            if (e.code == 404) {
                return null
            }
            throw e
        }
    }

    fun store(orgId: String, datasetId: String, entityWeights: EntityWeightRecord) {
        dataService.featureWeightsApi.saveFeatureWeights(orgId, datasetId, entityWeights.toDataServiceWeightConfig())
        monitorConfigUpdater.scheduleMonitorConfigUpdate(orgId, datasetId)
    }

    fun delete(orgId: String, datasetId: String) {
        dataService.featureWeightsApi.deleteFeatureWeights(orgId, datasetId)
        monitorConfigUpdater.clearMonitorConfigUpdate(orgId, datasetId)
    }
}
