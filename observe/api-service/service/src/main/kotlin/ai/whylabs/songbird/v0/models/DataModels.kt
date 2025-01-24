package ai.whylabs.songbird.v0.models

import ai.whylabs.dataservice.model.Granularity
import ai.whylabs.songbird.util.DocUtils
import io.swagger.v3.oas.annotations.media.Schema

@Schema(
    description = "A TimePeriod represents the bucketing that a dataset has undergone.",
    example = DocUtils.ExampleTimePeriod
)
enum class TimePeriod {
    P1M,
    P1W,
    P1D,
    PT1H;

    fun toGranularity(): Granularity {
        return when (this) {
            P1M -> Granularity.MONTHLY
            P1W -> Granularity.WEEKLY
            P1D -> Granularity.DAILY
            PT1H -> Granularity.HOURLY
        }
    }

    fun toDataServiceGranularity(): String {
        return this.name
    }

    companion object {
        fun fromDataServiceGranularity(granularity: String): TimePeriod {
            return TimePeriod.valueOf(granularity)
        }
    }
}

@Schema(description = "The category associated with the model type")
enum class ModelCategory {
    MODEL,
    DATA
}

@Schema(description = "The type of model associated with the dataset")
enum class ModelType(val category: ModelCategory) {
    // ML types
    CLASSIFICATION(ModelCategory.MODEL),
    REGRESSION(ModelCategory.MODEL),
    EMBEDDINGS(ModelCategory.MODEL),
    LLM(ModelCategory.MODEL),
    RANKING(ModelCategory.MODEL),
    MODEL_OTHER(ModelCategory.MODEL),

    // Data types
    DATA_SOURCE(ModelCategory.DATA),
    DATA_STREAM(ModelCategory.DATA),
    DATA_TRANSFORM(ModelCategory.DATA),
    DATA_OTHER(ModelCategory.DATA),
}
