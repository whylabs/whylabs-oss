package ai.whylabs.songbird.v0.ddb

import ai.whylabs.songbird.util.RandomUtils.newId
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.TimePeriod

// we check for empty values when serializing data so we have a fake value here
// to ensure that we don't accidentally serialize empty organization ID etc...
const val PlaceHolder = "PLACEHOLDER"

const val AccountUserPrefix = "ACCOUNT_USER"
const val AWSMarketplacePrefix = "AWS_MARKETPLACE"
const val AlertsPrefix = "ALERTS"
const val EventsPrefix = "EVENTS"
const val DatasetProfilePrefix = "DATASET_PROFILE"
const val LogTransactionPrefix = "LOG_TRANSACTION"
const val ClaimMembershipPrefix = "CLAIM_MEMBERSHIP"
const val MembershipPrefix = "MEMBERSHIP"
const val ModelPrefix = "MODEL"
const val OrgPrefix = "ORG"
const val SegmentPrefix = "SEGMENT"
const val SegmentIdPrefix = "SEGMENT_ID"
const val SessionExpirationPrefix = "SESSION_EXPIRATION"
const val SessionPrefix = "SESSION"
const val SubscriptionPrefix = "SUBSCRIPTION"
const val TimePeriodPrefix = "TIME_PERIOD"
const val TagPrefix = "TAG"
const val UserPrefix = "USER"
const val VersionPrefix = "VERSION"
const val AssetPrefix = "ASSET"

// merging
const val MergeJobPrefix = "MERGE_JOB"
const val LogEntryPrefix = "LOG_ENTRY"
const val ReferenceProfilePrefix = "REFERENCE_PROFILE"
const val SegmentedReferenceProfilePrefix = "SEGMENTED_REFERENCE_PROFILE"
const val PartDatasetProfilePrefix = "PART_DATASET_PROFILE"

/**
 * SESSION
 * This is a concept that we have in whylogs for managing anonymous dataset uploads.
 */
private val sessionKeyCreator = KeyCreator(SessionPrefix) { (sessionId) -> SessionKey(sessionId) }

data class SessionKey(val sessionId: String) : BaseKey by sessionKeyCreator.baseKey(sessionId)
class SessionKeyTypeConverter : IdTypeConverter<SessionKey> by sessionKeyCreator.converter()

private val sessionExpirationKeyCreator = KeyCreator(SessionExpirationPrefix) { (id) -> SessionExpirationKey(id) }

data class SessionExpirationKey(val id: String) : BaseKey by sessionExpirationKeyCreator.baseKey(id)
class SessionExpirationKeyTypeConverter : IdTypeConverter<SessionExpirationKey> by sessionExpirationKeyCreator.converter()

/**
 * ORG
 */
private val orgKeyCreator = KeyCreator(OrgPrefix) { (orgId) -> OrgKey(orgId) }

data class OrgKey(val orgId: String) : BaseKey by orgKeyCreator.baseKey(orgId)
class OrgKeyTypeConverter : IdTypeConverter<OrgKey> by orgKeyCreator.converter()

/**
 * Subscription
 */
private val subscriptionKeyCreator = KeyCreator(SubscriptionPrefix) { (orgId) -> SubscriptionKey(orgId) }

data class SubscriptionKey(val orgId: String) : BaseKey by subscriptionKeyCreator.baseKey(orgId)
class SubscriptionKeyTypeConverter : IdTypeConverter<SubscriptionKey> by subscriptionKeyCreator.converter()

/**
 * Log Transaction
 */
private val logTransactionKeyCreator = KeyCreator(LogTransactionPrefix) { (orgId) -> LogTransactionKey(orgId) }

data class LogTransactionKey(val transactionId: String) : BaseKey by logTransactionKeyCreator.baseKey(transactionId)
class LogTransactionKeyTypeConverter : IdTypeConverter<LogTransactionKey> by logTransactionKeyCreator.converter()

/**
 * AWS Marketplace metadata for an org
 */
private val awsMarketplaceKeyCreator = KeyCreator(AWSMarketplacePrefix) { (customerId) -> AWSMarketplaceKey(customerId) }

/**
 * The customer id is an id that represents an AWS account. We get this id from AWS Marketplace. When
 * users signup through their UI then end up generating a post request to observatory that has a token
 * that resolves to this id. It's ultimately associated with one of our orgs.
 */
data class AWSMarketplaceKey(val customerId: String) : BaseKey by awsMarketplaceKeyCreator.baseKey(customerId)
class AWSMarketplaceKeyTypeConverter : IdTypeConverter<AWSMarketplaceKey> by awsMarketplaceKeyCreator.converter()

/**
 * Membership
 */
private val membershipKeyCreator =
    KeyCreator(OrgPrefix, MembershipPrefix) { (orgId, userId) -> MembershipKey(orgId, userId) }

data class MembershipKey(val orgId: String, val userId: String) :
    BaseKey by membershipKeyCreator.baseKey(orgId, userId)

class MembershipKeyTypeConverter :
    IdTypeConverter<MembershipKey> by membershipKeyCreator.converter()

/**
 * Claim Membership
 */
private val claimMembershipKeyCreator =
    KeyCreator(OrgPrefix, ClaimMembershipPrefix) { (orgId, userId) -> ClaimMembershipKey(orgId, userId) }

data class ClaimMembershipKey(val orgId: String, val userId: String) :
    BaseKey by claimMembershipKeyCreator.baseKey(orgId, userId)

class ClaimMembershipKeyTypeConverter :
    IdTypeConverter<ClaimMembershipKey> by claimMembershipKeyCreator.converter()

/**
 * MODEL
 */

private val modelKeyCreator =
    KeyCreator(OrgPrefix, ModelPrefix) { (orgId, modelId) -> ModelKey(orgId, modelId) }

data class ModelKey(val orgId: String, val modelId: String) :
    BaseKey by modelKeyCreator.baseKey(orgId, modelId)

class ModelKeyTypeConverter : IdTypeConverter<ModelKey> by modelKeyCreator.converter()

/**
 * MODEL + TIME PERIOD
 */
private val modelPeriodKeyCreator =
    KeyCreator(OrgPrefix, ModelPrefix, TimePeriodPrefix) { (orgId, modelId, timePeriod) ->
        ModelPeriodKey(orgId, modelId, TimePeriod.valueOf(timePeriod))
    }

data class ModelPeriodKey(val orgId: String, val modelId: String, val timePeriod: TimePeriod) :
    BaseKey by modelPeriodKeyCreator.baseKey(orgId, modelId, timePeriod.name)

class ModelPeriodKeyTypeConverter :
    IdTypeConverter<ModelPeriodKey> by modelPeriodKeyCreator.converter()

/**
 * ALERTS
 */
private val alertsKeyCreator =
    KeyCreator(OrgPrefix, AlertsPrefix) { (orgId, alertId) -> AlertsKey(orgId, alertId) }

data class AlertsKey(val orgId: String, val alertsId: String = newId("alerts")) :
    BaseKey by alertsKeyCreator.baseKey(orgId, alertsId)

class AlertsKeyConverter : IdTypeConverter<AlertsKey> by alertsKeyCreator.converter()

/**
 * EVENTS
 */

private val eventKeyCreator =
    KeyCreator(OrgPrefix, EventsPrefix) { (orgId, eventsId) -> EventsKey(orgId, eventsId) }

data class EventsKey(val orgId: String, val eventsId: String = newId("events")) :
    BaseKey by eventKeyCreator.baseKey(orgId, eventsId)

class EventsKeyTypeConverter : IdTypeConverter<EventsKey> by eventKeyCreator.converter()

/**
 * SEGMENTS
 */
private val segmentKeyCreator =
    KeyCreator(OrgPrefix, ModelPrefix, SegmentPrefix) { (orgId, modelId, segmentText) ->
        SegmentKey(orgId, modelId, Segment.fromString(segmentText))
    }

data class SegmentKey(val orgId: String, val modelId: String, val segment: Segment? = Segment.All) :
    BaseKey by segmentKeyCreator.baseKey(
        orgId,
        modelId,
        (segment ?: Segment.All).toString()
    )

class SegmentKeyTypeConverter : IdTypeConverter<SegmentKey> by segmentKeyCreator.converter()

/**
 * SEGMENT IDS
 */
private val segmentIdKeyCreator =
    KeyCreator(OrgPrefix, SegmentIdPrefix) { (orgId, segmentId) -> SegmentIdKey(orgId, segmentId) }

data class SegmentIdKey(val orgId: String, val segmentId: String = newId("segment")) :
    BaseKey by segmentIdKeyCreator.baseKey(orgId, segmentId)

class SegmentIdKeyTypeConverter : IdTypeConverter<SegmentIdKey> by segmentIdKeyCreator.converter()

/**
 * UPLOAD
 */
private val logEntryKeyCreator =
    KeyCreator(OrgPrefix, LogEntryPrefix) { (orgId, uploadId) -> LogEntryKey(orgId, uploadId) }

data class LogEntryKey(val orgId: String, val logEntryId: String = newId("log")) :
    BaseKey by logEntryKeyCreator.baseKey(orgId, logEntryId)

class LogEntryKeyTypeConverter : IdTypeConverter<LogEntryKey> by logEntryKeyCreator.converter()

/**
 * Reference Profile
 */
private val referenceProfileKeyCreator =
    KeyCreator(OrgPrefix, ReferenceProfilePrefix) { (orgId, uploadId) ->
        ReferenceProfileKey(
            orgId,
            uploadId
        )
    }

data class ReferenceProfileKey(val orgId: String, val referenceId: String = newId("ref")) :
    BaseKey by referenceProfileKeyCreator.baseKey(orgId, referenceId)

class ReferenceProfileKeyTypeConverter :
    IdTypeConverter<ReferenceProfileKey> by referenceProfileKeyCreator.converter()

/**
 * Segmented Reference Profile
 */
private val segmentedReferenceProfileKeyCreator =
    KeyCreator(OrgPrefix, ModelPrefix, ReferenceProfilePrefix) { (orgId, datasetId, uploadId) ->
        SegmentedReferenceProfileKey(
            orgId,
            datasetId,
            uploadId
        )
    }

data class SegmentedReferenceProfileKey(val orgId: String, val datasetId: String, val referenceId: String) :
    BaseKey by segmentedReferenceProfileKeyCreator.baseKey(orgId, datasetId, referenceId)

class SegmentedReferenceProfileKeyTypeConverter :
    IdTypeConverter<SegmentedReferenceProfileKey> by segmentedReferenceProfileKeyCreator.converter()

/**
 * INCOMPLETE_DATASET_PROFILE
 */
private val partDatasetKeyCreator =
    KeyCreator(OrgPrefix, PartDatasetProfilePrefix) { (orgId, profileId) ->
        PartDatasetProfileKey(
            orgId,
            profileId
        )
    }

data class PartDatasetProfileKey(
    val orgId: String,
    val partProfileId: String = newId("part-dataset-profile"),
) :
    BaseKey by partDatasetKeyCreator.baseKey(orgId, partProfileId)

class PartDatasetProfileKeyTypeConverter :
    IdTypeConverter<PartDatasetProfileKey> by partDatasetKeyCreator.converter()

/**
 * DATASET_PROFILE
 */
private val datasetProfileKeyCreator =
    KeyCreator(OrgPrefix, DatasetProfilePrefix) { (orgId, profileId) ->
        DatasetProfileKey(
            orgId,
            profileId
        )
    }

data class DatasetProfileKey(val orgId: String, val profileId: String = newId("dataset-profile")) :
    BaseKey by datasetProfileKeyCreator.baseKey(orgId, profileId)

class DatasetProfileKeyTypeConverter :
    IdTypeConverter<DatasetProfileKey> by datasetProfileKeyCreator.converter()

/**
 * USER
 */
private val userKeyCreator = KeyCreator(UserPrefix) { (userId) -> UserKey(userId) }

data class UserKey(val userId: String) : BaseKey by userKeyCreator.baseKey(userId)
class UserKeyTypeConverter : IdTypeConverter<UserKey> by userKeyCreator.converter()

/**
 * ACCOUNT USER
 */
private val accountUserKeyCreator = KeyCreator(AccountUserPrefix, OrgPrefix) { (userId, orgId) -> AccountUserKey(userId, orgId) }

data class AccountUserKey(val userId: String, val orgId: String) : BaseKey by accountUserKeyCreator.baseKey(userId, orgId)
class AccountUserKeyTypeConverter : IdTypeConverter<AccountUserKey> by accountUserKeyCreator.converter()

/**
 * API KEY
 */
private val apiUserKeyCreator =
    KeyCreator(OrgPrefix, UserPrefix) { (orgId, userId) -> ApiUserKey(orgId, userId) }

data class ApiUserKey(val orgId: String, val userId: String) :
    BaseKey by apiUserKeyCreator.baseKey(orgId, userId)

class ApiUserKeyTypeConverter : IdTypeConverter<ApiUserKey> by apiUserKeyCreator.converter()

/**
 * POLICY CONFIGURATION
 */
private val policyConfigurationKeyCreator =
    KeyCreator(OrgPrefix, ModelPrefix, VersionPrefix) { (orgId, datasetId, versionId) ->
        PolicyConfigurationKey(
            orgId,
            datasetId,
            versionId
        )
    }

data class PolicyConfigurationKey(val orgId: String, val datasetId: String, val versionId: String) :
    BaseKey by policyConfigurationKeyCreator.baseKey(orgId, datasetId, versionId)

class PolicyConfigurationKeyTypeConverter :
    IdTypeConverter<PolicyConfigurationKey> by policyConfigurationKeyCreator.converter()

/**
 * ASSET METADATA
 */
private val assetMetadataKeyCreator =
    KeyCreator(OrgPrefix, AssetPrefix, TagPrefix, VersionPrefix) { (orgId, assetId, tagId, versionId) ->
        AssetMetadataKey(
            orgId,
            assetId,
            tagId,
            versionId,
        )
    }

data class AssetMetadataKey(val orgId: String, val assetId: String, val tagId: String, val versionId: String) :
    BaseKey by assetMetadataKeyCreator.baseKey(orgId, assetId, tagId, versionId)

class AssetMetadataKeyTypeConverter :
    IdTypeConverter<AssetMetadataKey> by assetMetadataKeyCreator.converter()
