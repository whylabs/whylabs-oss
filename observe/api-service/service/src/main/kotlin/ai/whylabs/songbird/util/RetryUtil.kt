package ai.whylabs.songbird.util

import com.github.michaelbull.retry.ContinueRetrying
import com.github.michaelbull.retry.StopRetrying
import com.github.michaelbull.retry.policy.RetryPolicy
import com.github.michaelbull.retry.policy.fullJitterBackoff
import com.github.michaelbull.retry.policy.limitAttempts
import com.github.michaelbull.retry.policy.plus
import com.github.michaelbull.retry.retry

private val defaultRetryPolicy: RetryPolicy<Throwable> = limitAttempts(5) + fullJitterBackoff(base = 10, max = 1000)

typealias SkipIf = (reason: Throwable) -> Boolean

suspend fun <T> retryService(skipRetryIf: (reason: Throwable) -> Boolean = { false }, block: suspend () -> T): T {
    val ignoredExceptions: RetryPolicy<Throwable> = {
        if (skipRetryIf(reason)) StopRetrying else ContinueRetrying
    }

    return retry(defaultRetryPolicy + ignoredExceptions) { block() }
}
