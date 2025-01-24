package ai.whylabs.songbird.feature

import ai.whylabs.dataservice.model.Metadata
import ai.whylabs.dataservice.model.SegmentWeightConfig
import ai.whylabs.dataservice.model.WeightConfig
import ai.whylabs.songbird.schema.IndexedDocument
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.SegmentTag
import com.fasterxml.jackson.annotation.JsonInclude
import io.swagger.v3.oas.annotations.media.ArraySchema
import io.swagger.v3.oas.annotations.media.Schema
import kotlin.math.abs

// Data classes compliant with the monitor schema document
data class EntityWeightRecord(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of entity weights for a segment"),
        uniqueItems = true
    )
    val segmentWeights: List<SegmentWeight>,
    val metadata: EntityWeightRecordMetadata = EntityWeightRecordMetadata()
) {
    internal fun toIndexedEntityWeightRecord(): IndexedEntityWeightRecord {
        return IndexedEntityWeightRecord(segmentWeights.map { it.toIndexedSegmentWeight() })
    }

    internal fun toDataServiceWeightConfig(): WeightConfig {
        val dsMetadata = Metadata().version(metadata.version.toInt()).updatedTimestamp(metadata.updatedTimestamp).author(metadata.author)
        return WeightConfig().segmentWeights(segmentWeights.map { it.toDataServiceSegmentWeightConfig() }).metadata(dsMetadata)
    }

    companion object {
        fun fromDataServiceSegmentWeightConfig(weights: List<SegmentWeightConfig>, metadata: Metadata): EntityWeightRecord {
            return EntityWeightRecord(
                segmentWeights = weights.map { SegmentWeight.fromDataServiceWeight(it) },
                metadata = EntityWeightRecordMetadata(metadata.version.toLong(), metadata.updatedTimestamp, metadata.author)
            )
        }
    }
}

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(
    description = "Weights for entities (columns) in a segment",
)
data class SegmentWeight(
    @field:Schema(nullable = false)
    val segment: Segment? = Segment(),
    @field:Schema(
        description = "Entity weight value for each entity"
    )
    val weights: Map<String, Double>
) {
    internal fun toIndexedSegmentWeight(): IndexedSegmentWeight {
        return IndexedSegmentWeight(
            segment,
            weights.toList()
                .sortedWith(compareByDescending<Pair<String, Double>> { abs(it.second) }.thenBy { it.first })
                .mapIndexed { index, pair -> IndexedEntityWeight(pair.first, pair.second, index + 1) }
        )
    }

    internal fun toDataServiceSegmentWeightConfig(): SegmentWeightConfig {
        val segmentWeightConfig = SegmentWeightConfig()
        segmentWeightConfig.segment = segment?.toDataServiceSegmentTags() ?: emptyList()
        segmentWeightConfig.weights = weights
        return segmentWeightConfig
    }

    companion object {
        fun fromDataServiceWeight(segmentWeight: SegmentWeightConfig): SegmentWeight {
            return SegmentWeight(Segment(segmentWeight.segment.map { SegmentTag(it.key, it.value) }), segmentWeight.weights)
        }
    }
}

@Schema(
    description = "Metadata for entity weight information",
)
data class EntityWeightRecordMetadata(val version: Long = 0, val updatedTimestamp: Long = System.currentTimeMillis(), val author: String = "system")

// Data classes optimized for OpenSearch indexes
data class IndexedEntityWeightDocument(
    val orgId: String,
    val datasetId: String,
    val entityWeight: IndexedEntityWeightRecord,
    val timestamp: Long = System.currentTimeMillis()
) : IndexedDocument

data class IndexedEntityWeightRecord(val segmentWeights: List<IndexedSegmentWeight>) {
    internal fun toEntityWeightRecord(metadata: EntityWeightRecordMetadata = EntityWeightRecordMetadata()): EntityWeightRecord {
        return EntityWeightRecord(segmentWeights.map { it.toSegmentWeight() }, metadata)
    }
}

data class IndexedSegmentWeight(
    val segment: Segment? = Segment(),
    val weights: List<IndexedEntityWeight>
) {
    internal fun toSegmentWeight(): SegmentWeight {
        return SegmentWeight(segment, weights.map { it.name to it.value }.toMap())
    }
}

data class IndexedEntityWeight(
    val name: String,
    val value: Double,
    val rank: Int?
)
