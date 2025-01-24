package ai.whylabs.songbird.util

import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

internal class IdUtilsKtTest {

    @Test
    fun `ambiguous characters are excluded`() {
        val set = alphaNumPool.toSet()
        Assertions.assertFalse(set.contains('0'), "0")
        Assertions.assertFalse(set.contains('o'), "o")
        Assertions.assertFalse(set.contains('1'), "1")
        Assertions.assertFalse(set.contains('i'), "i")
        Assertions.assertFalse(set.contains('O'), "O")
        Assertions.assertFalse(set.contains('I'), "I")
    }

    @Test
    fun `test size works`() {
        val id = randomAlphaNumericId(10)
        Assertions.assertEquals(10, id.length)
    }
}
