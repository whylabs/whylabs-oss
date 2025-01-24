package ai.whylabs.songbird.monitor

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "Analyzer entity in the configuration", requiredProperties = ["id, targetMatrix, config"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class Analyzer(
    val id: String,
    val config: AnalyzerConfig,
    val targetMatrix: AnalyzerTargetMatrix? = null,
    val schedule: AnalyzerSchedule? = null,
    val targetSize: Int? = null,
)

@Schema(description = "Analyzer schedule", requiredProperties = ["type"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class AnalyzerSchedule(
    val type: String,
    val cadence: String? = null,
)

@Schema(description = "Analyzer config", requiredProperties = ["type", "metric"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class AnalyzerConfig(
    val metric: String? = null,
    val type: String,
    val analyzerIds: List<String>? = null,
    val lower: Number? = null,
    val upper: Number? = null,
    val minLowerThreshold: Number? = null,
    val maxUpperThreshold: Number? = null
)

@Schema(description = "Analyzer target matrix", requiredProperties = ["type"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class AnalyzerTargetMatrix(
    val type: String,
    val include: List<String>? = null,
    val exclude: List<String>? = null,
    val segments: List<Segment> = emptyList()
)

@Schema(description = "Segment", requiredProperties = ["tags"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class Segment(
    val tags: List<SegmentTag>,
)

@Schema(description = "Segment tag", requiredProperties = ["key", "value"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class SegmentTag(
    val key: String,
    val value: String,
)
