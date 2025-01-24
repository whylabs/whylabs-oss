package ai.whylabs.songbird.util

import com.amazonaws.services.s3.AmazonS3URI

enum class RegionBucket(val region: String, val bucket: String, val uri: AmazonS3URI) {
    US_WEST_2("us-west-2", "songbird-20201223060057342600000001", AmazonS3URI("https://songbird-20201223060057342600000001.s3.us-west-2.amazonaws.com")),
    AP_SOUTHEAST_2("ap-southeast-2", "whylabs-datasets-ap-southeast-2", AmazonS3URI("https://whylabs-datasets-ap-southeast-2.s3.ap-southeast-2.amazonaws.com")),
    CA_CENTRAL_1("ca-central-1", "whylabs-datasets-ca-central-1", AmazonS3URI("https://whylabs-datasets-ca-central-1.s3.ca-central-1.amazonaws.com"));

    companion object {
        fun fromRegion(region: String?): RegionBucket? {
            if (region.isNullOrBlank()) {
                return null
            }
            return values().firstOrNull { it.region == region }
        }

        fun fromUri(uri: String?): RegionBucket? {
            if (uri.isNullOrBlank()) {
                return null
            }
            val amazonS3Uri = AmazonS3URI(uri)
            return values().firstOrNull {
                amazonS3Uri.bucket == it.bucket && amazonS3Uri.region == it.region
            }
        }
    }
}
