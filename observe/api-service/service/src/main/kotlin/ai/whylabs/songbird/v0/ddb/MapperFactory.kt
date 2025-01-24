package ai.whylabs.songbird.v0.ddb

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.dao.ApiKeyItem
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.SegmentTypeConverter
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperConfig
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTypeConverterFactory
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

private inline fun <reified T : BaseKey> DynamoDBTypeConverterFactory.Builder.withConverter(
    converter: IdTypeConverter<T>,
): DynamoDBTypeConverterFactory.Builder {
    return this.with(String::class.java, T::class.java, converter)
}

@Factory
class MapperFactory : JsonLogging {

    @Singleton
    fun typeConverterFactory(): DynamoDBTypeConverterFactory {
        return DynamoDBTypeConverterFactory.standard()
            .override()
            .withConverter(AlertsKeyConverter())
            .withConverter(DatasetProfileKeyTypeConverter())
            .withConverter(EventsKeyTypeConverter())
            .withConverter(LogEntryKeyTypeConverter())
            .withConverter(LogTransactionKeyTypeConverter())
            .withConverter(ReferenceProfileKeyTypeConverter())
            .withConverter(ModelKeyTypeConverter())
            .withConverter(ModelPeriodKeyTypeConverter())
            .withConverter(OrgKeyTypeConverter())
            .withConverter(AWSMarketplaceKeyTypeConverter())
            .withConverter(SessionKeyTypeConverter())
            .withConverter(SessionExpirationKeyTypeConverter())
            .withConverter(PartDatasetProfileKeyTypeConverter())
            .withConverter(SegmentKeyTypeConverter())
            .withConverter(SegmentIdKeyTypeConverter())
            .withConverter(SegmentedReferenceProfileKeyTypeConverter())
            .withConverter(SubscriptionKeyTypeConverter())
            .withConverter(UserKeyTypeConverter())
            .withConverter(AccountUserKeyTypeConverter())
            .withConverter(MembershipKeyTypeConverter())
            .withConverter(ClaimMembershipKeyTypeConverter())
            .withConverter(ApiUserKeyTypeConverter())
            .withConverter(PolicyConfigurationKeyTypeConverter())
            .withConverter(AssetMetadataKeyTypeConverter())
            .with(String::class.java, Segment::class.java, SegmentTypeConverter.Instance)
            .build()
    }

    @Singleton
    fun tableResolver(config: EnvironmentConfig): DynamoDBMapperConfig.TableNameResolver {
        return DynamoDBMapperConfig.TableNameResolver { clazz: Class<*>, _: DynamoDBMapperConfig ->
            val tableName = when (clazz) {
                // API key
                ApiKeyItem::class.java -> config.getEnv(EnvironmentVariable.ApiKeyTable)
                // global actions table
                NotificationActionItem::class.java -> config.getEnv(EnvironmentVariable.GlobalActionsTable)
                LogEntryItem::class.java,
                ReferenceProfileItem::class.java,
                SegmentedReferenceProfileItem::class.java,
                -> config.getEnv(EnvironmentVariable.DataTable)
                // metadata table
                MonitorConfigV3MetadataItem::class.java,
                OrganizationItem::class.java,
                AWSMarketplaceMetadataItem::class.java,
                LogTransactionMetadataItem::class.java,
                SessionItem::class.java,
                SessionExpirationItem::class.java,
                SubscriptionMetadataItem::class.java,
                UserItem::class.java,
                AccountUserItem::class.java,
                MembershipItem::class.java,
                ClaimMembershipItem::class.java,
                PolicyConfigurationItem::class.java,
                AssetMetadataItem::class.java,
                -> config.getEnv(EnvironmentVariable.MetadataTable)
                else -> throw IllegalArgumentException("Don't know which table to use for ${clazz.name}. Update MapperFactory to define a table.")
            }
            log.debug("Using table override $tableName for ${clazz.name}")

            tableName
        }
    }

    @Singleton
    fun ddbMapper(
        ddbClient: AmazonDynamoDB,
        tableNameResolver: DynamoDBMapperConfig.TableNameResolver,
        typeConverterFactory: DynamoDBTypeConverterFactory,
    ): DynamoDBMapper {

        val tableConfig = DynamoDBMapperConfig.builder()
            .withTableNameResolver(tableNameResolver)
            .withTypeConverterFactory(typeConverterFactory)
            .build()

        return DynamoDBMapper(ddbClient, tableConfig)
    }

    companion object {
        const val PlaceHolder = "see tableResolver() method above"
    }
}
