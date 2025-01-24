package ai.whylabs.songbird.dataservice

import ai.whylabs.songbird.logging.JsonLogging
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

val RETRYABLE_CODES = intArrayOf(408, 425, 429, 502, 503, 504)
val RETRY_DELAY: Long = 1000 // millis
val RETRY_FACTOR: Double = 2.0

class RetryInterceptor(retryableCodes: IntArray = RETRYABLE_CODES) : Interceptor, JsonLogging {
    private val codes = retryableCodes
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var delay = RETRY_DELAY
        repeat(3) {
            try {
                val response = chain.proceed(request)
                if (response.isSuccessful) return response
                if (response.code !in this.codes) return response
                response.close()
                log.warn("Retrying ${request.url} in $delay ms after unsuccessful response code ${response.code}")
            } catch (e: IOException) {
                log.warn("Retrying ${request.url} in $delay ms after IOException: $e")
            }

            Thread.sleep(delay)
            delay = (delay * RETRY_FACTOR).toLong()
        }
        return chain.proceed(request)
    }
}
