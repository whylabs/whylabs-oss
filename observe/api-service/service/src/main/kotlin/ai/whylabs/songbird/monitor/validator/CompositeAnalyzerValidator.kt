package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.Analyzer
import ai.whylabs.songbird.monitor.AnalyzerTargetMatrix
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.DocumentContext

class CompositeAnalyzerValidator : MonitorConfigValidator, JsonLogging {
    override fun validation(config: DocumentContext): ValidatorResult {
        val objectMapper = jacksonObjectMapper()

        val allAnalyzerIds = config.read<List<String>>("$.analyzers[*].id").toSet()
        val parentCompositeAnalyzersIds = config.read<List<String>>("$.analyzers[?(@.config.type == 'conjunction' || @.config.type == 'disjunction')].id")
        val childCompositeAnalyzersIds = config.read<List<List<String>>>("$.analyzers[?(@.config.type == 'conjunction' || @.config.type == 'disjunction')].config.analyzerIds")
        val flatListOfChildIds = childCompositeAnalyzersIds.flatten()

        val parentAnalyzersAsString: String = objectMapper.writeValueAsString(
            config.read<List<Map<String, String>>>("$.analyzers[?(@.config.type == 'conjunction' || @.config.type == 'disjunction')]")
        )
        val parentAnalyzers: List<Analyzer> = objectMapper.readValue(parentAnalyzersAsString, object : TypeReference<List<Analyzer>>() {})

        val childAnalyzersAsString: String = objectMapper.writeValueAsString(
            config.read<List<Map<String, String>>>("$.analyzers[?(@.id in $flatListOfChildIds)]")
        )
        val childAnalyzers: List<Analyzer> = objectMapper.readValue(childAnalyzersAsString, object : TypeReference<List<Analyzer>>() {})

        if (!validateSchedule(parentAnalyzers, childAnalyzers)) {
            validatorResult = ValidatorResult.Warning("Composite analyzers must have the same schedule as their child analyzers.")
            return validatorResult
        }

        if (!validateSegmentConfig(parentAnalyzers, childAnalyzers)) {
            validatorResult = ValidatorResult.Warning("All children must share identical segment configs with their parent.")
            return validatorResult
        }

        if (parentCompositeAnalyzersIds.size > 10) {
            validatorResult = ValidatorResult.Error("Only 10 composite analyzers are allowed for a dataset.")
            return validatorResult
        }

        if (!limitCompositeAnalyzerChildren(childCompositeAnalyzersIds)) {
            validatorResult = ValidatorResult.Error("Composite analyzers must have between 2 and 10 child analyzers.")
            return validatorResult
        }

        if (isChildIdMissing(childCompositeAnalyzersIds, allAnalyzerIds)) {
            validatorResult = ValidatorResult.Error("A missing analyzer is referenced in composite analyzer.")
            return validatorResult
        }

        if (!parentMustNotSelfAssign(parentCompositeAnalyzersIds, childCompositeAnalyzersIds)) {
            validatorResult = ValidatorResult.Warning("Parent analyzer cannot include itself in the child analyzerIds.")
            return validatorResult
        }

        if (!compositeAnalyzersHaveOneLevelDepth(childCompositeAnalyzersIds, parentCompositeAnalyzersIds)) {
            validatorResult = ValidatorResult.Warning("Composite analyzers cannot have child analyzers that are also composite analyzers.")
            return validatorResult
        }

        if (!hasUniqueChildIds(childCompositeAnalyzersIds)) {
            validatorResult = ValidatorResult.Warning("A child analyzer cannot have multiple parents.")
            return validatorResult
        }

        if (validateTargetMatrix(childAnalyzers) != null) {
            validatorResult = ValidatorResult.Warning("Invalid target matrix configuration: ${validateTargetMatrix(childAnalyzers)?.value}")
            return validatorResult
        }

        validatorResult = ValidatorResult.Success
        return validatorResult
    }

    internal fun limitCompositeAnalyzerChildren(childCompositeAnalyzersIds: List<List<String>>): Boolean {
        childCompositeAnalyzersIds.forEach {
            if (it.isEmpty() || it.size <= 1 || it.size > 10) {
                return false
            }
        }
        return true
    }

    internal fun validateSchedule(parentAnalyzers: List<Analyzer>, childAnalyzers: List<Analyzer>): Boolean {
        for (parent in parentAnalyzers) {
            for (child in childAnalyzers) {
                if (parent.schedule != child.schedule) {
                    return false
                }
            }
        }
        return true
    }

    internal fun validateSegmentConfig(parentAnalyzers: List<Analyzer>, childAnalyzers: List<Analyzer>): Boolean {
        for (parent in parentAnalyzers) {
            val parentSegmentConfig = parent.targetMatrix?.segments

            // Can't have segments on the Parent composite analyzer && all children must have the same segment if one is specified
            val distinctSegmentCount = childAnalyzers.map { it.targetMatrix?.segments }.distinct().count()
            if (!parentSegmentConfig.isNullOrEmpty() || distinctSegmentCount > 1) {
                return false
            }
            // May not specify more than one segment nor use segment wildcards
            for (child in childAnalyzers) {
                val childSegments = child.targetMatrix?.segments
                if (childSegments.isNullOrEmpty()) {
                    continue
                }
                val childSegmentTags = childSegments.map { it.tags }.flatten()
                if (childSegmentTags.size > 1) {
                    return false
                }
                childSegmentTags.forEach {
                    if (it.value == "*") {
                        return false
                    }
                }
            }
        }
        return true
    }

    internal fun isChildIdMissing(childCompositeAnalyzersIds: List<List<String>>, allAnalyzerIds: Set<String>): Boolean {
        childCompositeAnalyzersIds.forEach {
            it.forEach { childAnalyzerId ->
                if (!allAnalyzerIds.contains(childAnalyzerId)) {
                    return true
                }
            }
        }
        return false
    }

    internal fun validateTargetMatrix(childAnalyzers: List<Analyzer>): TargetMatrixError? {
        childAnalyzers.forEach {
            val targetMatrixObj = it.targetMatrix ?: return null
            if ((targetMatrixObj.include?.size ?: 0) > 1) {
                return TargetMatrixError.SINGLE_ENTRY
            }
            if (targetMatrixObj.include?.contains("*") == true) {
                return TargetMatrixError.WILDCARDS
            }
            if (targetMatrixStartsWithPrefixes(targetMatrixObj)) {
                return TargetMatrixError.PREFIXES
            }
        }
        return null
    }

    private fun targetMatrixStartsWithPrefixes(targetMatrix: AnalyzerTargetMatrix): Boolean {
        if (targetMatrix.include.isNullOrEmpty() && targetMatrix.exclude.isNullOrEmpty()) {
            return false
        }
        if (targetMatrix.include.isNullOrEmpty() && !targetMatrix.exclude.isNullOrEmpty()) {
            return targetMatrix.exclude.all { it.startsWith("weight>") } || targetMatrix.exclude.all { it.startsWith("group:") }
        }
        if (!targetMatrix.include.isNullOrEmpty() && targetMatrix.exclude.isNullOrEmpty()) {
            return targetMatrix.include.all { it.startsWith("weight>") } || targetMatrix.include.all { it.startsWith("group:") }
        }
        return false
    }

    internal fun compositeAnalyzersHaveOneLevelDepth(childCompositeAnalyzersIds: List<List<String>>, parentCompositeAnalyzersIds: List<String>): Boolean {
        val allChildAnalyzers = childCompositeAnalyzersIds.flatten()
        return allChildAnalyzers.none { parentCompositeAnalyzersIds.contains(it) }
    }

    internal fun parentMustNotSelfAssign(parentCompositeAnalyzersIds: List<String>, childCompositeAnalyzersIds: List<List<String>>): Boolean {
        childCompositeAnalyzersIds.forEachIndexed { index, childIdsForParent ->
            val parentId = parentCompositeAnalyzersIds[index]
            if (childIdsForParent.contains(parentId)) {
                return false
            }
        }
        return true
    }

    internal fun hasUniqueChildIds(compositeChildAnalyzersIds: List<List<String>>): Boolean {
        val flattenedList = compositeChildAnalyzersIds.flatten()
        val duplicates = flattenedList.groupBy { it }.filter { it.value.size > 1 }.keys

        if (duplicates.isNotEmpty()) {
            duplicates.forEach { duplicate ->
                log.warn("Child analyzer with multiple parents found: $duplicate")
            }
        }

        return duplicates.isEmpty()
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

enum class TargetMatrixError(val value: String) {
    SINGLE_ENTRY("Child target matrix must contain a single entry."),
    WILDCARDS("Child target matrix entry must not contain wildcards."),
    PREFIXES("Child target matrix entry must not be prefixed by 'weight>' or 'group:'.")
}
