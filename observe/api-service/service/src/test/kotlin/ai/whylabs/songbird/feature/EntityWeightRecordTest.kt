package ai.whylabs.songbird.feature

import ai.whylabs.songbird.v0.models.Segment
import com.google.common.collect.Maps
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

internal class EntityWeightRecordTest {

    @Test
    fun `test rank calculation by absolute value weight`() {
        val segmentWeight = SegmentWeight(
            segment = Segment(),
            mapOf("a" to 0.2, "bb" to -0.3, "c" to 0.4, "ba" to 0.3)
        )
        val actualRanks = segmentWeight.toIndexedSegmentWeight().weights.map { it.name to it.rank }.toMap()
        // abs(weight) then alphabetical
        val expectedRanks = mapOf("a" to 4, "bb" to 3, "c" to 1, "ba" to 2)
        Assertions.assertTrue(Maps.difference(actualRanks, expectedRanks).areEqual())
    }
}
