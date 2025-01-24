package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.EmailUtils
import ai.whylabs.songbird.util.MetadataUtils
import ai.whylabs.songbird.v0.dao.UserDAO
import ai.whylabs.songbird.v0.ddb.UserItem
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

class UserNotFoundException(userId: String?, userEmail: String?) :
    ResourceNotFoundException("User", userId, "User's email domain: ${MetadataUtils.getDomain(userEmail)}")

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/user")
@WhyLabsInternal
@Tags(
    Tag(name = "User", description = "Endpoint for users"),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
class UserController @Inject constructor(
    private val userDAO: UserDAO,
) {

    @Operation(
        operationId = "GetUser",
        summary = "Get a user by their id.",
        description = "Get a user by their id.",
    )
    @Get(
        uri = "/{user_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getUser(user_id: String): User {
        return userDAO.load(UserItem(userId = user_id)) ?: throw UserNotFoundException(user_id, null)
    }

    @Operation(
        operationId = "GetUserByEmail",
        summary = "Get a user by their email.",
        description = "Get a user by their email.",
    )
    @Get(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getUserByEmail(@QueryValue email: String): User {
        // Email MUST be a query value. If its a path parameter then some calls will fail because of
        // special characters. Micronaut apparently doesn't do any automatic url escaping for paths
        val items = userDAO.list(UserItem(email = email.lowercase())).toList()
        if (items.isEmpty()) {
            throw UserNotFoundException(null, email)
        }
        return items.first()
    }

    @Operation(
        operationId = "CreateUser",
        summary = "Create a user.",
        description = "Create a user.",
    )
    @Post(
        uri = "/",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    fun createUser(@Body request: CreateUserRequest): User {
        val email = request.email.lowercase()
        // This isn't the technically correct solution to ensuring unique emails. The right thing
        // is this: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-example.html
        // That said, this is way easier and it'll work 99.999% of the time, so we'll consider this tech debt.
        val currentItems = userDAO.list(UserItem(email = email)).toList()
        if (currentItems.isNotEmpty()) {
            throw IllegalArgumentException("Email already exists.")
        }

        EmailUtils.requireValid(email)

        // Create the new user
        // The user id is ultimately made up of the sha256 value of the email combined with a static salt.
        // We use this as the user id so that we can get the effect of unique emails as primary keys without
        // having to actually make the email address the primary key, which we can't do because we don't want to
        // worry about passing people's email addresses around for use as an argument in apis.
        val user = userDAO.create(
            UserItem(email = email)
        )

        return userDAO.load(UserItem(userId = user.userId), consistentReads = true) ?: throw ResourceNotFoundException("user", user.userId)
    }

    @AuditableResponseBody
    @Operation(
        operationId = "UpdateUser",
        summary = "Update a user.",
        description = "Update a user.",
    )
    @Put(
        uri = "/",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    fun updateUser(@Body request: User): User {
        userDAO.update(userDAO.toItem(request))
        return userDAO.load(UserItem(userId = request.userId), consistentReads = true) ?: throw ResourceNotFoundException("user", request.userId)
    }
}

@Schema(description = "Request for creating a new user", requiredProperties = ["email"])
data class CreateUserRequest(
    @field:Schema(description = "The users email address")
    val email: String,
)

@Schema(description = "User metadata", requiredProperties = ["email", "userId"])
data class User(
    @field:Schema(description = "The id of the user.")
    val userId: String,
    @field:Schema(description = "The user's email address.")
    val email: String,
    @field:Schema(description = "The user's JSON serialized preferences. Schema defined in Dashbird.")
    val preferences: String?,
)
