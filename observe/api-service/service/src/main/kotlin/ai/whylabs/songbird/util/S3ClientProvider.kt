package ai.whylabs.songbird.util

import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.auth.AWSCredentialsProvider
import com.amazonaws.auth.AWSStaticCredentialsProvider
import com.amazonaws.auth.BasicSessionCredentials
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.AmazonS3ClientBuilder
import com.google.common.cache.CacheBuilder
import com.google.common.cache.CacheLoader
import com.google.common.cache.LoadingCache
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class S3ClientProvider @Inject constructor(
    private val awsCredentialsProvider: AWSCredentialsProvider,
    private val s3: AmazonS3,
) : JsonLogging {

    private val cachedClient: LoadingCache<String, AmazonS3> =
        CacheBuilder.newBuilder()
            .expireAfterWrite(60, TimeUnit.MINUTES)
            .maximumSize(1000)
            .build(
                CacheLoader.from { region: String ->
                    createClient(region)
                }
            )

    private fun createClient(region: String, accessKey: String? = null, secretKey: String? = null, sessionToken: String? = null): AmazonS3 {
        val credentialsProvider = if (!accessKey.isNullOrBlank() && !secretKey.isNullOrBlank() && !sessionToken.isNullOrBlank()) {
            AWSStaticCredentialsProvider(BasicSessionCredentials(accessKey, secretKey, sessionToken))
        } else {
            awsCredentialsProvider
        }

        return AmazonS3ClientBuilder.standard()
            .withRegion(region)
            .withCredentials(credentialsProvider)
            .build()
    }

    fun createCustomClient(accessKey: String, secretKey: String, region: String, sessionToken: String): AmazonS3 {
        return createClient(region, accessKey, secretKey, sessionToken)
    }

    fun client(region: String? = null): AmazonS3 {
        if (region.isNullOrBlank() || region == "us-west-2") {
            return s3
        }
        return cachedClient.get(region)
    }
}
