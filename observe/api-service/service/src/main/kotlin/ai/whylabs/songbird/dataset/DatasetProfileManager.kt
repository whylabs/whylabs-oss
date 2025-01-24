package ai.whylabs.songbird.dataset

import ai.whylabs.dataservice.model.DeleteAnalysisRequest
import ai.whylabs.dataservice.model.DeleteProfileRequest
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.dao.ModelDAO
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.time.Instant
import java.time.temporal.ChronoUnit

@Singleton
class DatasetProfileManager @Inject constructor(
    private val dataService: DataService,
    private val modelDAO: ModelDAO,
) : JsonLogging {
    val mapper = jacksonObjectMapper()

    fun deleteProfiles(orgId: String, datasetId: String, startTimestamp: Long?, endTimestamp: Long?, beforeUploadTimestamp: Long?, deleteAnalyzerResults: Boolean? = true, columnName: String?) {
        val startInstant = startTimestamp?.let { Instant.ofEpochMilli(it) }
        val endInstant = endTimestamp?.let { Instant.ofEpochMilli(it) }

        modelDAO.getModel(orgId = orgId, modelId = datasetId)
        if (startInstant != null && endInstant?.isBefore(startInstant) == true) {
            throw IllegalArgumentException("End timestamp cannot be before start timestamp when deleting dataset profiles")
        }
        if (startInstant?.isAfter(Instant.now().minus(1, ChronoUnit.HOURS)) == true) {
            throw IllegalArgumentException("Start timestamp must be more than 1 hour prior. Only data older than 1 hour is eligible for deletion.")
        }
        if (endInstant?.isAfter(Instant.now().minus(1, ChronoUnit.HOURS)) == true) {
            throw IllegalArgumentException("End timestamp must be more than 1 hour prior. Only data older than 1 hour is eligible for deletion.")
        }

        deleteProfilesDataService(orgId, datasetId, startTimestamp, endTimestamp, beforeUploadTimestamp, columnName)

        if (deleteAnalyzerResults == true) {
            deleteAnalyzerResults(orgId, datasetId, null, startTimestamp, endTimestamp)
        }
    }

    fun deleteAnalyzerResults(orgId: String, datasetId: String, analyzerId: String?, startTimestamp: Long?, endTimestamp: Long?) {
        val startInstant = startTimestamp?.let { Instant.ofEpochMilli(it) }
        val endInstant = endTimestamp?.let { Instant.ofEpochMilli(it) }

        modelDAO.getModel(orgId = orgId, modelId = datasetId)
        if (startInstant != null && endInstant?.isBefore(startInstant) == true) {
            throw IllegalArgumentException("End timestamp cannot be before start timestamp when deleting analyzer results")
        }

        deleteAnalyzerResultsDataService(orgId, datasetId, analyzerId, startTimestamp, endTimestamp)
    }

    private fun deleteProfilesDataService(orgId: String, datasetId: String, startTimestamp: Long?, endTimestamp: Long?, beforeUploadTimestamp: Long?, columnName: String?) {
        val delRqst = DeleteProfileRequest().orgId(orgId).datasetId(datasetId)
        if (startTimestamp !== null) {
            delRqst.deleteGte(startTimestamp)
        }
        if (endTimestamp !== null) {
            delRqst.deleteLt(endTimestamp)
        }
        if (beforeUploadTimestamp !== null) {
            delRqst.beforeUploadTs(beforeUploadTimestamp)
        }
        if (columnName !== null) {
            delRqst.columnName(columnName)
        }
        dataService.profileApi.requestProfileDeletion(delRqst)
    }

    private fun deleteAnalyzerResultsDataService(orgId: String, datasetId: String, analyzerId: String?, startTimestamp: Long?, endTimestamp: Long?) {
        val delRqst = DeleteAnalysisRequest().orgId(orgId).datasetId(datasetId)
        if (startTimestamp !== null) {
            delRqst.deleteGte(startTimestamp)
        }
        if (endTimestamp !== null) {
            delRqst.deleteLt(endTimestamp)
        }
        if (analyzerId !== null) {
            delRqst.analyzerId(analyzerId)
        }
        dataService.analysisApi.requestAnalysisDeletion(delRqst)
    }
}
