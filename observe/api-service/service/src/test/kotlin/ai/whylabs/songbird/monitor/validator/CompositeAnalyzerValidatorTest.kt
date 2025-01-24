package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.monitor.Analyzer
import ai.whylabs.songbird.monitor.AnalyzerConfig
import ai.whylabs.songbird.monitor.AnalyzerSchedule
import ai.whylabs.songbird.monitor.AnalyzerTargetMatrix
import ai.whylabs.songbird.monitor.Segment
import ai.whylabs.songbird.monitor.SegmentTag
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class CompositeAnalyzerValidatorTest {

    @Test
    fun `compositeAnalyzersHaveOneLevelDepth should return true if child analyzers are not also parents`() {
        val validator = CompositeAnalyzerValidator()

        val parentCompositeAnalyzersIds = listOf("parent1", "parent2")
        val childCompositeAnalyzersIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "child4")
        )
        val result = validator.compositeAnalyzersHaveOneLevelDepth(childCompositeAnalyzersIds, parentCompositeAnalyzersIds)
        Assertions.assertTrue(result)

        val modifiedParentIds = listOf("parent1", "child2")
        val shouldBeFalse = validator.compositeAnalyzersHaveOneLevelDepth(childCompositeAnalyzersIds, modifiedParentIds)

        Assertions.assertFalse(shouldBeFalse)
    }

    @Test
    fun `hasUniqueChildIds should return true if children dont repeat`() {
        val validator = CompositeAnalyzerValidator()

        val childCompositeAnalyzersIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "child4")
        )
        val result = validator.hasUniqueChildIds(childCompositeAnalyzersIds)
        Assertions.assertTrue(result)

        val modifiedChildIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "child2")
        )
        val shouldBeFalse = validator.hasUniqueChildIds(modifiedChildIds)

        Assertions.assertFalse(shouldBeFalse)
    }

    @Test
    fun parentMustNotSelfAssign() {
        val validator = CompositeAnalyzerValidator()

        val parentCompositeAnalyzersIds = listOf("parent1", "parent2")
        val childCompositeAnalyzersIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "child4")
        )
        val result = validator.parentMustNotSelfAssign(parentCompositeAnalyzersIds, childCompositeAnalyzersIds)
        Assertions.assertTrue(result)

        val modifiedChildIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "parent2")
        )
        val shouldBeFalse = validator.parentMustNotSelfAssign(parentCompositeAnalyzersIds, modifiedChildIds)

        Assertions.assertFalse(shouldBeFalse)
    }

    @Test
    fun `validateTargetMatrix should return each respective warning message`() {
        val validator = CompositeAnalyzerValidator()

        val childAnalyzers = listOf(
            Analyzer(
                id = "child1",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "column",
                    include = listOf("a", "b"),
                    exclude = listOf("c", "d")
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child2",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "column",
                    include = listOf("*"),
                    exclude = listOf("c")
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child3",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "column",
                    include = listOf("weight>1"),
                    exclude = listOf()
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child4",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "column",
                    include = listOf(),
                    exclude = listOf("group:1")
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            )
        )

        val singleEntry = validator.validateTargetMatrix(listOf(childAnalyzers[0]))
        Assertions.assertEquals(TargetMatrixError.SINGLE_ENTRY, singleEntry)

        val wildcards = validator.validateTargetMatrix(listOf(childAnalyzers[1]))
        Assertions.assertEquals(TargetMatrixError.WILDCARDS, wildcards)

        val prefixes = validator.validateTargetMatrix(listOf(childAnalyzers[2]))
        Assertions.assertEquals(TargetMatrixError.PREFIXES, prefixes)

        val groupError = validator.validateTargetMatrix(listOf(childAnalyzers[3]))
        Assertions.assertEquals(TargetMatrixError.PREFIXES, groupError)
    }

    @Test
    fun `isChildIdMissing should return true if child id is missing`() {
        val validator = CompositeAnalyzerValidator()

        val allAnalyzerIds = setOf("child1", "child2", "child3", "child4")
        val childCompositeAnalyzersIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "child4")
        )
        val result = validator.isChildIdMissing(childCompositeAnalyzersIds, allAnalyzerIds)
        Assertions.assertFalse(result)

        val modifiedChildIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "child5")
        )
        val shouldBeTrue = validator.isChildIdMissing(modifiedChildIds, allAnalyzerIds)

        Assertions.assertTrue(shouldBeTrue)
    }

    @Test
    fun `limitCompositeAnalyzerChildren should return true if child composite analyzers are within limits`() {
        val validator = CompositeAnalyzerValidator()

        val childCompositeAnalyzersIds = listOf(
            listOf("child1", "child2"),
            listOf("child3", "child4")
        )
        val result = validator.limitCompositeAnalyzerChildren(childCompositeAnalyzersIds)
        Assertions.assertTrue(result)

        val tooLittleChildren = listOf(
            listOf("child1"),
        )
        val shouldFail = validator.limitCompositeAnalyzerChildren(tooLittleChildren)

        Assertions.assertFalse(shouldFail)

        val tooManyChildren = listOf(
            listOf("child1", "child2", "child3", "child4", "child5", "child6", "child7", "child8", "child9", "child10", "child11")
        )
        val shouldBeFalse = validator.limitCompositeAnalyzerChildren(tooManyChildren)

        Assertions.assertFalse(shouldBeFalse)
    }

    @Test
    fun `validateSchedule returns true when parent and child analyzers have the same schedule`() {
        val validator = CompositeAnalyzerValidator()
        val analyzer = Analyzer(
            id = "odd-powderblue-owl-9385-analyzer",
            schedule = AnalyzerSchedule(type = "immediate"),
            config = AnalyzerConfig(
                metric = "regression.mae",
                type = "TrailingWindow"
            )
        )
        val result = validator.validateSchedule(listOf(analyzer), listOf(analyzer)) // same schedule, so can reuse
        Assertions.assertTrue(result)
    }

    @Test
    fun `validateSchedule returns false when parent and child analyzers have different schedules`() {
        val validator = CompositeAnalyzerValidator()

        val parentAnalyzer = Analyzer(
            id = "odd-powderblue-owl-9385-analyzer",
            schedule = AnalyzerSchedule(type = "immediate"),
            config = AnalyzerConfig(
                metric = "regression.mae",
                type = "TrailingWindow"
            ),
        )
        val childAnalyzer = Analyzer(
            id = "odd-powderblue-owl-9385-analyzer",
            schedule = AnalyzerSchedule(type = "fixed", cadence = "weekly"),
            config = AnalyzerConfig(
                metric = "regression.mae",
                type = "TrailingWindow"
            ),
        )

        val result = validator.validateSchedule(listOf(parentAnalyzer), listOf(childAnalyzer))
        Assertions.assertFalse(result)
    }

    @Test
    fun `validateSchedule returns true when there are no parent or child analyzers`() {
        val validator = CompositeAnalyzerValidator()
        val parentAnalyzers = emptyList<Analyzer>()
        val childAnalyzers = emptyList<Analyzer>()
        val result = validator.validateSchedule(parentAnalyzers, childAnalyzers)
        Assertions.assertTrue(result)
    }

    @Test
    fun `validateSegmentConfig returns false if children have different segments`() {
        val parentAnalyzers = listOf(
            Analyzer(
                id = "test-analyzer",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    type = "conjunction",
                    analyzerIds = listOf("child1", "child2")
                )

            )
        )

        val childAnalyzers = listOf(
            Analyzer(
                id = "child1",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child2",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k2", value = "v2")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            )
        )

        val validator = CompositeAnalyzerValidator()
        val result = validator.validateSegmentConfig(parentAnalyzers, childAnalyzers)
        Assertions.assertFalse(result)
    }

    @Test
    fun `validateSegmentConfig returns false if parent has segments`() {
        val parentAnalyzers = listOf(
            Analyzer(
                id = "test-analyzer",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    type = "conjunction",
                    analyzerIds = listOf("child1", "child2")
                )
            )
        )
        val childAnalyzers = listOf(
            Analyzer(
                id = "child1",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child2",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            )
        )

        val validator = CompositeAnalyzerValidator()
        val result = validator.validateSegmentConfig(parentAnalyzers, childAnalyzers)
        Assertions.assertFalse(result)
    }

    @Test
    fun `validateSegmentConfig returns false if child has more than one segment`() {
        val parentAnalyzers = listOf(
            Analyzer(
                id = "test-analyzer",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                ),
                config = AnalyzerConfig(
                    type = "conjunction",
                    analyzerIds = listOf("child1", "child2")
                )
            )
        )
        val childAnalyzers = listOf(
            Analyzer(
                id = "child1",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v"),
                                SegmentTag(key = "k2", value = "v2")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child2",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            )
        )

        val validator = CompositeAnalyzerValidator()
        val result = validator.validateSegmentConfig(parentAnalyzers, childAnalyzers)
        Assertions.assertFalse(result)
    }

    @Test
    fun `validateSegmentConfig returns false if child has wildcard segment`() {
        val parentAnalyzers = listOf(
            Analyzer(
                id = "test-analyzer",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                ),
                config = AnalyzerConfig(
                    type = "conjunction",
                    analyzerIds = listOf("child1", "child2")
                )
            )
        )
        val childAnalyzers = listOf(
            Analyzer(
                id = "child1",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v"),
                                SegmentTag(key = "k2", value = "*")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child2",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            )
        )

        val validator = CompositeAnalyzerValidator()
        val result = validator.validateSegmentConfig(parentAnalyzers, childAnalyzers)
        Assertions.assertFalse(result)
    }

    @Test
    fun `validateSegmentConfig returns true with valid configurations`() {
        val parentAnalyzers = listOf(
            Analyzer(
                id = "test-analyzer",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                ),
                config = AnalyzerConfig(
                    type = "conjunction",
                    analyzerIds = listOf("child1", "child2")
                )
            )
        )
        val childAnalyzers = listOf(
            Analyzer(
                id = "child1",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            ),
            Analyzer(
                id = "child2",
                targetMatrix = AnalyzerTargetMatrix(
                    type = "dataset",
                    segments = listOf(
                        Segment(
                            tags = listOf(
                                SegmentTag(key = "k", value = "v")
                            )
                        )
                    )
                ),
                config = AnalyzerConfig(
                    metric = "regression.mae",
                    type = "diff",
                )
            )
        )

        val validator = CompositeAnalyzerValidator()
        val result = validator.validateSegmentConfig(parentAnalyzers, childAnalyzers)
        Assertions.assertTrue(result)
    }
}
