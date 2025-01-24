package ai.whylabs.songbird.util

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class RetryUtilKtTest {

    @Test
    fun `retries the right errors`() = runBlocking {
        var i = 0
        retryService(skipRetrying) {
            if (i <= 3) {
                i += 1
                throw IllegalArgumentException("Gets retried")
            }
        }
        Assertions.assertEquals(4, i, "times run")
    }

    @Test
    fun `doesn't retry the wrong errors`() {
        var i = 0
        Assertions.assertThrows(NullPointerException::class.java) {
            runBlocking {
                retryService(skipRetrying) {
                    if (i == 0) {
                        i += 1
                        throw NullPointerException("Does not get retried, fails right away")
                    }
                }
            }
        }
        Assertions.assertEquals(1, i, "times run")
    }
}

private val skipRetrying: SkipIf = {
    val skipThese: Set<Class<out Throwable>> = setOf(
        IllegalStateException::class.java,
        NullPointerException::class.java
    )

    skipThese.contains(it.javaClass)
}
