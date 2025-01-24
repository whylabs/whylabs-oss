package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.ConfigValidator
import ai.whylabs.songbird.monitor.MonitorConfigManager
import ai.whylabs.songbird.monitor.MonitorConfigVersion
import ai.whylabs.songbird.monitor.MonitorConfigVersions
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.S3UploadParams
import ai.whylabs.songbird.util.UploadContent
import ai.whylabs.songbird.util.UploadType
import com.amazonaws.AmazonServiceException
import com.amazonaws.services.s3.AmazonS3
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Patch
import io.micronaut.http.annotation.Put
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject
import java.util.concurrent.TimeUnit

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/${DocUtils.OrganizationUri}/models")
@Tag(name = "Monitor", description = "Interactions related to monitors.")
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class MonitorController @Inject constructor(
    private val monitorConfigManager: MonitorConfigManager,
    private val monitorConfigVersions: MonitorConfigVersions,
    private val configValidator: ConfigValidator,
    private val environmentConfig: EnvironmentConfig,
    private val s3: AmazonS3,
) : JsonLogging {
    private val mapper = jacksonObjectMapper()

    @AuditableResponseBody
    @Operation(
        operationId = "PutRequestMonitorRunConfig",
        summary = "Put the RequestMonitorRun config into S3.",
        description = "Put the RequestMonitorRun config into S3.",
        tags = ["Internal"],
    )
    @Put(uri = "/{dataset_id}/request-monitor-run", produces = [MediaType.APPLICATION_JSON])
    @WhyLabsInternal
    fun putRequestMonitorRunConfig(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleAnalyzerId) analyzer_ids: List<String>,
        overwrite: Boolean,
        @Schema(example = DocUtils.ExampleStartMilli) start_timestamp: Long,
        @Schema(example = DocUtils.ExampleEndMilli) end_timestamp: Long,
    ): HttpResponse<String> {
        // parameter validation
        if (org_id.isEmpty() || dataset_id.isEmpty() || analyzer_ids.isEmpty() ||
            end_timestamp < start_timestamp
        ) {
            return HttpResponse.status<String>(HttpStatus.BAD_REQUEST).body("parameter validation failed")
        }
        if (TimeUnit.MILLISECONDS.toDays(end_timestamp - start_timestamp) > 2 * 365) {
            return HttpResponse.status<String>(HttpStatus.BAD_REQUEST)
                .body("parameter validation failed - over two year period")
        }

        // create json
        val config = RequestMonitorRunConfig(
            orgId = org_id,
            datasetId = dataset_id,
            analyzerIds = analyzer_ids,
            overwrite = overwrite,
            start = start_timestamp,
            end = end_timestamp
        )

        val configJson: String = mapper.writeValueAsString(config)

        // upload to s3
        val s3Params = S3UploadParams(
            bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket),
            orgId = org_id,
            modelId = dataset_id,
            datasetTimestamp = null,
            uploadType = UploadType.RequestMonitorRunConfig,
            uploadContent = UploadContent.InputStreamContent(configJson.byteInputStream()),
            logger = log,
            config = environmentConfig
        )

        try {
            // if file exists, it will overwrite existing file
            s3Params.upload(s3)
        } catch (e: AmazonServiceException) {
            return HttpResponse.status<String>(HttpStatus.BAD_REQUEST).body("S3 upload failed")
        }

        return HttpResponse.status<String>(HttpStatus.OK)
    }

    @Operation(
        operationId = "ValidateMonitorConfigV3",
        summary = "Validate the monitor config document for a given dataset.",
        description = "Validate the monitor config document for a given dataset."
    )
    @Put(uri = "/{dataset_id}/monitor-config/v3/validate")
    fun validateMonitorConfigV3(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue verbose: Boolean?,
        @Body config: String,
    ): Response {
        log.info("Validating the monitor config document for $org_id/$dataset_id")
        configValidator.validateConfig(config, org_id, dataset_id, verbose = verbose ?: false)

        val existingConfig = monitorConfigManager.load(org_id, dataset_id).asJson()
        configValidator.preventChangesToSystemComponents(config, existingConfig)
        return Response()
    }

    @Operation(
        operationId = "ListConstraints",
        summary = "List the constraints for a given dataset.",
        description = "List the constraints for a given dataset.",
    )
    @Get(uri = "/{dataset_id}/constraints", processes = [MediaType.APPLICATION_JSON])
    fun listConstraints(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): List<String> {
        return monitorConfigManager.listConstraints(org_id, dataset_id)
    }

    @Operation(
        operationId = "ListMonitorConfigV3Versions",
        summary = "List the monitor config document versions for a given dataset.",
        description = "List the monitor config document versions for a given dataset.",
        tags = ["Internal"],
    )
    @Get(uri = "/{dataset_id}/monitor-config/v3/versions", processes = [MediaType.APPLICATION_JSON])
    @WhyLabsInternal
    fun listMonitorConfigV3Versions(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): List<MonitorConfigVersion> {
        log.info("Getting the monitor config document versions for $org_id/$dataset_id")
        return monitorConfigVersions.loadVersions(org_id, dataset_id)
    }

    @Operation(
        operationId = "GetMonitorConfigV3Version",
        summary = "Get the monitor config document version for a given dataset.",
        description = "Get the monitor config document version for a given dataset.",
        tags = ["Internal"],
    )
    @Get(uri = "/{dataset_id}/monitor-config/v3/versions/{version_id}", produces = [MediaType.APPLICATION_JSON])
    @WhyLabsInternal
    fun getMonitorConfigV3Version(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleReferenceId) version_id: String,
    ): String {
        log.info("Getting the monitor config document version for $org_id/$dataset_id/$version_id")
        return monitorConfigVersions.getVersion(org_id, dataset_id, version_id)
    }

    @Operation(
        operationId = "GetMonitorConfigV3",
        summary = "Get the monitor config document for a given dataset.",
        description = "Get the monitor config document for a given dataset.",
    )
    @Get(uri = "/{dataset_id}/monitor-config/v3", produces = [MediaType.APPLICATION_JSON])
    fun getMonitorConfigV3(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue include_entity_schema: Boolean?,
        @QueryValue include_entity_weights: Boolean?,
    ): String {
        log.info("Getting the monitor config document for $org_id/$dataset_id")
        return monitorConfigManager.load(
            org_id, dataset_id,
            includeEntitySchema = include_entity_schema ?: false,
            includeEntityWeights = include_entity_weights ?: false
        ).asJson()
    }

    @Operation(
        operationId = "PutMonitorConfigV3",
        summary = "Save the monitor config document for a given dataset.",
        description = "Save the monitor config document for a given dataset."
    )
    @Put(
        uri = "/{dataset_id}/monitor-config/v3",
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun putMonitorConfigV3(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body config: String,
    ): Response {
        log.info("Saving the monitor config document for $org_id/$dataset_id")
        monitorConfigManager.store(org_id, dataset_id, config)
        return Response()
    }

    @Operation(
        operationId = "PatchMonitorConfigV3",
        summary = "Patch an updated monitor config document for a given dataset.",
        description = "Save an updated monitor config document for a given dataset.  Monitors and analyzers matching an existing ID are replaced."
    )
    @Patch(
        uri = "/{dataset_id}/monitor-config/v3",
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun patchMonitorConfigV3(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body config: String,
    ): Response {
        log.info("Patching the monitor config document for $org_id/$dataset_id")
        monitorConfigManager.patch(org_id, dataset_id, config)
        return Response()
    }

    @Operation(
        operationId = "GetAnalyzer",
        summary = "Get the analyzer config for a given dataset.",
        description = "Get the analyzer config for a given dataset."
    )
    @Get(uri = "/{dataset_id}/monitor-config/analyzer/{analyzer_id}", produces = [MediaType.APPLICATION_JSON])
    fun getAnalyzer(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleAnalyzerId) analyzer_id: String,
    ): String {
        log.info("Getting the analyzer config for $org_id/$dataset_id/$analyzer_id")
        return monitorConfigManager.loadAnalyzer(org_id, dataset_id, analyzer_id) ?: throw ResourceNotFoundException("analyzer", analyzer_id)
    }

    @AuditableResponseBody
    @Operation(
        operationId = "PutAnalyzer",
        summary = "Save the analyzer config for a given dataset.",
        description = "Save the analyzer config for a given dataset."
    )
    @Put(
        uri = "/{dataset_id}/monitor-config/analyzer/{analyzer_id}",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun putAnalyzer(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleAnalyzerId) analyzer_id: String,
        @Body config: String,
    ): Response {
        log.info("Saving the analyzer config for $org_id/$dataset_id/$analyzer_id")
        monitorConfigManager.storeAnalyzer(org_id, dataset_id, analyzer_id, config)
        return Response()
    }

    @Operation(
        operationId = "DeleteAnalyzer",
        summary = "Delete the analyzer config for a given dataset.",
        description = "Delete the analyzer config for a given dataset."
    )
    @Delete(
        uri = "/{dataset_id}/monitor-config/analyzer/{analyzer_id}",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun deleteAnalyzer(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleAnalyzerId) analyzer_id: String,
    ): Response {
        monitorConfigManager.loadAnalyzer(org_id, dataset_id, analyzer_id) ?: throw ResourceNotFoundException("analyzer", analyzer_id)
        log.info("Deleting the analyzer config for $org_id/$dataset_id/$analyzer_id")
        monitorConfigManager.deleteAnalyzer(org_id, dataset_id, analyzer_id)
        return Response()
    }

    @Operation(
        operationId = "GetMonitor",
        summary = "Get the monitor config for a given dataset.",
        description = "Get the monitor config for a given dataset."
    )
    @Get(uri = "/{dataset_id}/monitor-config/monitor/{monitor_id}", produces = [MediaType.APPLICATION_JSON])
    fun getMonitor(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleMonitorId) monitor_id: String,
    ): String {
        log.info("Getting the monitor config for $org_id/$dataset_id/$monitor_id")
        return monitorConfigManager.loadMonitor(org_id, dataset_id, monitor_id) ?: throw ResourceNotFoundException("monitor", monitor_id)
    }

    @Operation(
        operationId = "PutMonitor",
        summary = "Save the monitor for a given dataset.",
        description = "Save the monitor for a given dataset."
    )
    @Put(
        uri = "/{dataset_id}/monitor-config/monitor/{monitor_id}",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun putMonitor(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleMonitorId) monitor_id: String,
        @Body config: String,
    ): Response {
        log.info("Saving the monitor config for $org_id/$dataset_id/$monitor_id")
        monitorConfigManager.storeMonitor(org_id, dataset_id, monitor_id, config)
        return Response()
    }

    @Operation(
        operationId = "DeleteMonitor",
        summary = "Delete the monitor for a given dataset.",
        description = "Delete the monitor for a given dataset."
    )
    @Delete(
        uri = "/{dataset_id}/monitor-config/monitor/{monitor_id}",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun deleteMonitor(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleMonitorId) monitor_id: String,
    ): Response {
        monitorConfigManager.loadMonitor(org_id, dataset_id, monitor_id) ?: throw ResourceNotFoundException("monitor", monitor_id)
        log.info("Deleting the monitor config for $org_id/$dataset_id/$monitor_id")
        monitorConfigManager.deleteMonitor(org_id, dataset_id, monitor_id)
        return Response()
    }
}
