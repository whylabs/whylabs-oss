package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.v0.dao.AWSMarketplace
import ai.whylabs.songbird.v0.dao.AWSMarketplaceMetadataDAO
import ai.whylabs.songbird.v0.dao.MembershipDAO
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.UserDAO
import ai.whylabs.songbird.v0.ddb.MembershipItem
import ai.whylabs.songbird.v0.ddb.Role
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.ddb.UserItem
import ai.whylabs.songbird.v0.models.TimePeriod
import com.amazonaws.services.marketplacemetering.model.InvalidTokenException
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject
import kotlinx.coroutines.runBlocking

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/provision")
@Tags(
    Tag(name = "Provision", description = "Endpoint for creating sets of resources."),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
@WhyLabsInternal
class ProvisionController @Inject constructor(
    private val userDAO: UserDAO,
    private val organizationDAO: OrganizationDAO,
    private val config: EnvironmentConfig,
    private val membershipDAO: MembershipDAO,
    private val modelDAO: ModelDAO,
    private val awsMarketplaceMetadataDAO: AWSMarketplaceMetadataDAO,
    private val awsMarketplace: AWSMarketplace,
) : JsonLogging {

    @Operation(
        operationId = "ProvisionNewUser",
        summary = "Create the resources that a new user needs to use WhyLabs via the website.",
        description = "Create the resources that a new user needs to use WhyLabs via the website.",
    )
    @Post(
        uri = "/new-user",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun provisionNewUser(@Body request: ProvisionNewUserRequest): ProvisionNewUserResponse = runBlocking {
        // check for existing user
        val userEmail = request.email.lowercase()
        val matchingUsers = userDAO.listValidated(request.email, request.expectExisting)

        val userId = matchingUsers.firstOrNull()?.userId ?: userDAO.create(
            UserItem(email = userEmail)
        ).userId

        // create an org for the user to effectively own
        // TODO perhaps orgs should have an (ownedBy: userId) field. We could use that ot make sure
        // that no one can remove you from the org you own which would let us avoid having to have a 0
        // org experience for orphaned users who were removed from all of their orgs.
        val orgId = organizationDAO.createOrganization(name = request.orgName, subscriptionTier = request.subscriptionTier)

        // create a membership for this user in that org
        membershipDAO.create(MembershipItem(orgId = orgId, userId = userId, role = Role.ADMIN, default = true))

        // create a model for them to use by default
        val model = modelDAO.saveModel(
            orgId = orgId,
            modelId = modelDAO.incrementAndGetModelId(orgId),
            modelName = request.modelName,
            timePeriod = TimePeriod.P1D,
            expectExisting = false,
            modelType = null
        )

        ProvisionNewUserResponse(userId = userId, orgId = orgId, modelId = model.id)
    }

    /*
     * WARNING don't make this a javadoc or swagger will feak out and fail the builds claiming the
     * description is missing, despite having a description, a summary, AND a javadoc....
     *
     * This api is responsible for creating resources when users come from AWS Marketplace for
     * the first time. There are two scenarios:
     *  - 1 Nothing has been created and this is the first time anyone from an AWS account has
     *  attempted to sign up for WhyLabs.
     *  - 2 Someone is using the marketplace page to "signin" to WhyLabs after someone else has
     *  created the resources already.
     *
     *  In the case of 1, we need to create a new user, new org, add the user to the org, and
     *  associate the marketplace metadata with the org.
     *
     *  In the case of 2, we need to create a new user, associate the user with the existing org.
     */
    @Operation(
        operationId = "ProvisionAWSMarketplaceNewUser",
        summary = "Create resources for a new user coming from AWS Marketplace",
        description = "Create resources for a new user coming from AWS Marketplace",
    )
    @Post(
        uri = "/marketplace/aws/new-user",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun provisionAWSMarketplaceNewUser(@Body request: ProvisionNewMarketplaceUserRequest): ProvisionNewAWSMarketplaceUserResponse {
        val userEmail = request.email.lowercase()
        val matchingUsers = userDAO.listValidated(request.email, request.expectExisting)

        // Resolve the customer id through the token
        val customer = try {
            awsMarketplace.resolveCustomerId(request.customerIdToken)
        } catch (t: InvalidTokenException) {
            throw IllegalArgumentException("Error calling aws marketplace: ${t.message}", t)
        }

        val productCode = config.getEnv(EnvironmentVariable.AWSMarketplaceProductCode)
        if (customer.productCode != productCode) {
            // This should be impossible, just a precaution. We have a single hardcoded product code that marketplace
            // generated for us per stage.
            throw IllegalArgumentException("Unknown product code ${customer.productCode} associated with the customer id token.")
        }

        // Lookup the dimension they subscribed to. This is called an "entitlement" in marketplace lingo.
        // This is effectively their payment tier, or how many models they're allowed to have.
        val marketplaceMetadata = awsMarketplace.getCustomerEntitlementMetadata(customer.customerIdentifier)

        // Create the new user
        val userId = matchingUsers.firstOrNull()?.userId ?: userDAO.create(
            UserItem(email = userEmail)
        ).userId

        val item = awsMarketplaceMetadataDAO.toItem(marketplaceMetadata)
        val metadata = awsMarketplaceMetadataDAO.load(item)

        // Check to see if the metadata already exists
        val orgId = if (metadata != null) {
            log.info("Metadata for ${customer.customerIdentifier} already exists, not making a new one.")
            log.info("Updating expiration date for ${customer.customerIdentifier} to ${marketplaceMetadata.expirationTime}")
            val updatedItem = awsMarketplaceMetadataDAO.toItem(metadata.copy(expirationTime = marketplaceMetadata.expirationTime))
            awsMarketplaceMetadataDAO.update(updatedItem)
            // probably need to update the subscriptoinTier on the org actually
            metadata.orgId
        } else {
            log.info("Metadata for ${customer.customerIdentifier} does not exist. Making a new one and a new org.")
            // Create the metadata entry for the marketplace info
            val orgId = runBlocking {
                organizationDAO.createOrganization(name = request.orgName, subscriptionTier = SubscriptionTier.AWS_MARKETPLACE)
            }
            awsMarketplaceMetadataDAO.create(item.copy(createdBy = userId, orgId = orgId))
            orgId
        }

        // create a membership for this user in that org
        membershipDAO.createIfNotExists(MembershipItem(orgId = orgId, userId = userId, role = Role.ADMIN, default = true))

        val models = modelDAO.listModels(orgId, includeInactive = false)
        return if (models.isEmpty()) {
            // create a model for them to use by default
            val model = modelDAO.saveModel(
                orgId = orgId,
                modelId = modelDAO.incrementAndGetModelId(orgId),
                modelName = request.modelName,
                timePeriod = TimePeriod.P1D,
                expectExisting = false,
                modelType = null
            )
            ProvisionNewAWSMarketplaceUserResponse(userId = userId, orgId = orgId, modelId = model.id, customerId = customer.customerIdentifier)
        } else {
            ProvisionNewAWSMarketplaceUserResponse(userId = userId, orgId = orgId, modelId = models.first().id, customerId = customer.customerIdentifier)
        }
    }
}

@Schema(requiredProperties = ["email", "subscriptionTier", "orgName", "modelName"])
data class ProvisionNewUserRequest(
    val email: String,
    val orgName: String,
    val modelName: String,
    val subscriptionTier: SubscriptionTier,
    val expectExisting: Boolean? = false,
)

@Schema(requiredProperties = ["id", "email", "expectExistingUser"])
data class ProvisionDatabricksConnectionRequest(
    val id: String,
    val email: String,
    val expectExistingUser: Boolean,
)

@Schema(
    requiredProperties = [
        "email",
        "isConnectionEstablished",
        "accessToken",
        "hostname",
        "port",
        "workspaceUrl",
        "connectionId",
        "workspaceId",
        "demo",
        "cloudProvider",
        "isFreeTrial"
    ]
)

data class ProvisionNewMarketplaceUserRequest(
    val email: String,
    val orgName: String,
    val modelName: String,
    val customerIdToken: String,
    val expectExisting: Boolean? = null,
)

@Schema(requiredProperties = ["userId", "orgId", "modelId"])
data class ProvisionNewUserResponse(
    val userId: String,
    val orgId: String,
    val modelId: String
)

@Schema(requiredProperties = ["userId", "orgId", "modelId", "customerId"])
data class ProvisionNewAWSMarketplaceUserResponse(
    val userId: String,
    val orgId: String,
    val modelId: String,
    val customerId: String
)
