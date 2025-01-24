package ai.whylabs.songbird.security

data class AuthenticationToken(
    val token: String?,
    val metadata: AuthenticationTokenMetadata?,
) {
    fun asString(): String? {
        if (token != null && metadata != null) {
            return "$token:${metadata.orgId}"
        }
        return token
    }
    companion object {
        fun fromString(authentication: String?): AuthenticationToken {
            if (authentication == null) {
                return AuthenticationToken(token = null, metadata = null)
            }
            val parts = authentication.split(":")
            return when (parts.size) {
                2 -> AuthenticationToken(parts[0], AuthenticationTokenMetadata(orgId = parts[1]))
                else -> AuthenticationToken(authentication, metadata = null)
            }
        }
    }
}

data class AuthenticationTokenMetadata(
    val orgId: String
)
