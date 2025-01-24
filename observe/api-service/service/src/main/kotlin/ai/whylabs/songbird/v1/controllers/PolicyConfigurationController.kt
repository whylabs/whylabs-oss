package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.operations.getRequestUserId
import ai.whylabs.songbird.operations.getValidatedIdentity
import ai.whylabs.songbird.operations.setRequestAttribute
import ai.whylabs.songbird.secure.policy.PolicyConfiguration
import ai.whylabs.songbird.secure.policy.PolicyConfigurationListEntry
import ai.whylabs.songbird.secure.policy.PolicySchemaVersion
import ai.whylabs.songbird.secure.policy.PolicySource
import ai.whylabs.songbird.secure.policy.PolicyValidator
import ai.whylabs.songbird.secure.policy.SecurePolicyGenerator
import ai.whylabs.songbird.secure.policy.toPolicyConfigurationListEntry
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.controllers.Response
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.dao.PolicyConfigurationDAO
import ai.whylabs.songbird.v0.dao.UserDAO
import ai.whylabs.songbird.v0.ddb.PolicyConfigurationItem
import ai.whylabs.songbird.v0.ddb.PolicyConfigurationKey
import ai.whylabs.songbird.v0.ddb.UserItem
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.s3.AmazonS3
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.TextNode
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.http.annotation.QueryValue
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/policy")
@Tags(
    Tag(name = "Policy", description = "Endpoint for policy configuration."),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class PolicyConfigurationController @Inject constructor(
    private val policyConfigurationDAO: PolicyConfigurationDAO,
    private val s3: AmazonS3,
    private val policyValidator: PolicyValidator,
    private val policyGenerator: SecurePolicyGenerator,
    private val userDAO: UserDAO,
    private val modelDAO: ModelDAO,
    env: EnvironmentConfig,
) : JsonLogging {
    private val llmPolicyConfigurationSchemaKey = "policy_ui_controls/llm-policy-configuration-schema.json"
    private val s3Bucket = env.getEnv(EnvironmentVariable.StorageBucket)

    @Operation(
        operationId = "PutPolicy",
        summary = "Endpoint to store a policy configuration",
        description = "Endpoint to store a policy configuration",
    )
    @Post(
        uri = "/",
        consumes = [MediaType.APPLICATION_YAML],
    )
    fun putPolicyConfiguration(
        @QueryValue @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue label: String?,
        @Body policy: String,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
    ): AddPolicyResponse {
        if (!dataset_id.equals("default", ignoreCase = true)) {
            modelDAO.getModel(orgId, dataset_id) // Check if the model exists
        }

        policyValidator.checkValidPolicyConfiguration(policy)
        val newItem = addPolicy(orgId, dataset_id, label, policy)
        return AddPolicyResponse(label = newItem.label, version = newItem.version.toInt())
    }

    @Operation(
        operationId = "PutJsonPolicy",
        summary = "Endpoint to store a policy configuration from JSON",
        description = "Endpoint to store a policy configuration from JSON",
        tags = ["Internal"],
    )
    @Post(
        uri = "/json",
        consumes = [MediaType.APPLICATION_JSON],
    )
    @WhyLabsInternal
    @Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
    fun putJsonPolicyConfiguration(
        @QueryValue @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @QueryValue @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue label: String?,
        @Body policy: String,
    ): AddPolicyResponse {
        if (!dataset_id.equals("default", ignoreCase = true)) {
            modelDAO.getModel(org_id, dataset_id) // Check if the model exists
        }
        val policyJsonNodeTree: JsonNode = jacksonObjectMapper().readTree(policy)
        val policyJsonAsYaml = YAMLMapper().writeValueAsString(policyJsonNodeTree)
        setRequestAttribute(RequestOrganizationId, org_id)

        listOf("callbackSettings", "advancedSettings").forEach { key ->
            policyJsonNodeTree.get(key)?.let { node ->
                if (node !is TextNode) {
                    throw IllegalArgumentException("$key must be a string")
                }
                try {
                    YAMLMapper().readTree(node.asText())
                } catch (e: Exception) {
                    throw IllegalArgumentException("$key must be a valid YAML string")
                }
            }
        }

        val newItem = addPolicy(org_id, dataset_id, label, policyJsonAsYaml, source = PolicySource.UI.value)
        return AddPolicyResponse(label = newItem.label, version = newItem.version.toInt())
    }

    @Operation(
        operationId = "ListOrganizationPolicyConfigurations",
        summary = "Endpoint to get the policy configuration available for an organization",
        description = "Endpoint to get the policy configuration available for an organization",
    )
    @Get(
        uri = "/list",
        produces = [MediaType.APPLICATION_JSON],
    )
    fun listOrganizationPolicyConfigurations(
        @QueryValue include_policy: Boolean? = false,
        @QueryValue schema_version: String? = null,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
    ): List<PolicyConfigurationListEntry> {
        val schemaVersion = PolicySchemaVersion.fromString(schema_version)
            ?: throw IllegalArgumentException("Schema version is not supported")
        return listOrganizationPolicies(orgId, includePolicy = include_policy, schemaVersion = schemaVersion)
    }

    @Operation(
        operationId = "ListPolicyVersions",
        summary = "Endpoint to get the policy configuration versions",
        description = "Endpoint to get the policy configuration versions",
        tags = ["Internal"],
    )
    @Get(
        uri = "/versions",
        produces = [MediaType.APPLICATION_JSON],
    )
    @WhyLabsInternal
    @Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
    fun listPolicyConfigurationVersions(
        @QueryValue @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @QueryValue @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): List<PolicyConfigurationListEntry> {
        val policyList = listPolicies(org_id, dataset_id)
        return policyList.sortedByDescending { it.version.toInt() }
    }

    @Operation(
        operationId = "GetPolicy",
        summary = "Endpoint to get the policy configuration",
        description = "Endpoint to get the policy configuration",
    )
    @Get(
        uri = "/",
        produces = [MediaType.APPLICATION_YAML],
    )
    @Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole, SecurityValues.SecureContainerRole)
    fun getPolicyConfiguration(
        @QueryValue @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue label: String? = null,
        @QueryValue version: Int? = null,
        @QueryValue schema_version: String? = null,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
    ): String {
        val schemaVersion = PolicySchemaVersion.fromString(schema_version)
            ?: throw IllegalArgumentException("Schema version is not supported")
        val policy = getPolicy(orgId, dataset_id, label, version)
        if (policy?.policy == null) {
            throw IllegalArgumentException("Policy not found")
        }
        return policyGenerator.generatePolicy(policy, schemaVersion)
    }

    @Operation(
        operationId = "GetJsonPolicy",
        summary = "Endpoint to get the policy configuration as JSON",
        description = "Endpoint to get the policy configuration as JSON",
        tags = ["Internal"],
    )
    @Get(
        uri = "/json",
        produces = [MediaType.APPLICATION_JSON],
    )
    @WhyLabsInternal
    @Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
    fun getJsonPolicyConfiguration(
        @QueryValue @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @QueryValue @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue label: String? = null,
        @QueryValue version: Int? = null,
    ): String {
        setRequestAttribute(RequestOrganizationId, org_id)
        val policy = getPolicy(org_id, dataset_id, label, version)
        if (policy?.policy.isNullOrEmpty()) {
            throw IllegalArgumentException("Policy not found")
        }
        if (policy?.source != PolicySource.UI.value) {
            return jacksonObjectMapper().writeValueAsString(policy)
        } else {
            // Saved UI policy fields
            val yamlReader = ObjectMapper(YAMLFactory())
            val policyAsMap = yamlReader.readValue<MutableMap<String, Any>>(policy.policy)
            policyAsMap.put("policyVersion", policy.version.toInt())
            return jacksonObjectMapper().writeValueAsString(policyAsMap)
        }
    }

    @Operation(
        operationId = "UpdatePolicyConfigurationSchema",
        summary = "Endpoint to update the Policy Config. Schema",
        description = "Endpoint to update the Policy Configuration JSON Schema",
        tags = ["Internal"],
    )
    @Put(
        uri = "/policy-config-schema",
        consumes = [MediaType.APPLICATION_JSON],
    )
    @WhyLabsInternal
    fun updateUiControls(
        @Body request: String,
    ): Response {
        s3.putObject(
            s3Bucket,
            llmPolicyConfigurationSchemaKey,
            request
        )
        return Response()
    }

    @Operation(
        operationId = "GetPolicyConfigurationSchema",
        summary = "Endpoint to retrieve the Policy Config Schema",
        description = "Endpoint to retrieve the Policy Configuration JSON Schema",
        tags = ["Internal"],
    )
    @Get(
        uri = "/policy-config-schema",
        produces = [MediaType.APPLICATION_JSON],
    )
    @WhyLabsInternal
    fun getUiControls(): String {
        if (s3.doesObjectExist(s3Bucket, llmPolicyConfigurationSchemaKey).not()) {
            throw ResourceNotFoundException("Policy UI schema not found")
        }
        return s3.getObjectAsString(
            s3Bucket,
            llmPolicyConfigurationSchemaKey
        )
    }

    private fun getPolicy(orgId: String, datasetId: String, label: String? = null, version: Int? = null): PolicyConfiguration? {
        val queryFilters = mutableMapOf<String, Condition>()
        if (label != null) {
            queryFilters["label"] = Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withS(label))
        }
        if (version != null) {
            queryFilters["version"] = Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withS(version.toString()))
        }
        val policy = policyConfigurationDAO.query(
            item = PolicyConfigurationItem(orgId = orgId, datasetId = datasetId),
            queryFilters = queryFilters,
        ).maxByOrNull { it.version.toInt() }
        return policy
    }

    private fun listOrganizationPolicies(orgId: String, includePolicy: Boolean? = false, schemaVersion: PolicySchemaVersion): List<PolicyConfigurationListEntry> {
        val orgModels = modelDAO.listModels(orgId, includeInactive = false).map { it.id }.toSet() + "default"
        val policyList = policyConfigurationDAO.listByOrganization(orgId)
            .groupBy { it.datasetId }
            .filter { (datasetId, _) ->
                orgModels.contains(datasetId)
            }
            .mapNotNull { (_, policies) ->
                policies.maxByOrNull { it.version.toInt() }
            }
            .map {
                if (includePolicy == true && it.source == PolicySource.UI.value) {
                    it.copy(policy = policyGenerator.generatePolicy(it, schemaVersion))
                } else {
                    it
                }
            }
            .map {
                it.toPolicyConfigurationListEntry(includePolicy = includePolicy ?: false)
            }.toList()
        return policyList
    }

    private fun listPolicies(orgId: String, datasetId: String): List<PolicyConfigurationListEntry> {
        val policyList = policyConfigurationDAO.list(
            item = PolicyConfigurationItem(orgId = orgId, datasetId = datasetId),
        ).map {
            val email = if (it.author != null) {
                userDAO.load(UserItem(userId = it.author), consistentReads = true)?.email
            } else {
                null
            }
            it.toPolicyConfigurationListEntry(includePolicy = false).copy(
                author = email,
            )
        }.toList()
        return policyList
    }

    private fun addPolicy(orgId: String, datasetId: String, label: String? = null, policy: String, source: String? = null,): PolicyConfiguration {
        val version = policyConfigurationDAO.incrementAndGetId(orgId, datasetId).toString()
        val identity = getValidatedIdentity()?.identityId
        val keyHash = if (identity?.toIntOrNull() != null) {
            // If identity is a number, it's an AWS account system call, not the keyHash
            null
        } else {
            identity
        }
        val yamlReader = ObjectMapper(YAMLFactory())
        val yamlPolicy = yamlReader.readValue<Map<String, Any>>(policy).toMutableMap()
        if (source != PolicySource.UI.value) {
            // No need to inject these fields for UI policies. They will be added when the YAML is generated.
            yamlPolicy["id"] = "$orgId#$datasetId#$version"
            yamlPolicy["org_id"] = orgId
            yamlPolicy["whylabs_dataset_id"] = datasetId
            yamlPolicy["schema_version"] = PolicySchemaVersion.V0_1_0.value
            yamlPolicy["policy_version"] = version.toInt()
        }
        val updatedPolicy = yamlReader.writeValueAsString(yamlPolicy)

        val item = PolicyConfigurationItem(
            key = PolicyConfigurationKey(orgId, datasetId, version),
            orgId = orgId,
            datasetId = datasetId,
            version = version,
            policy = updatedPolicy,
            source = source,
            label = label,
            author = getRequestUserId(),
            identity = keyHash,
        )
        return policyConfigurationDAO.create(item)
    }
}

@Schema(requiredProperties = ["version"])
data class AddPolicyResponse(
    val label: String?,
    val version: Int,
)
