package ai.whylabs.songbird.security

object SecurityValues {
    const val WhyLabsSuperAdminOrgId = "0"
    const val WhyLabsAdministratorRole = "WHYLABS_ADMINISTRATOR"
    const val WhyLabsAdministratorScope = ":whylabs_administrator"
    const val WhyLabsSystemRole = "WHYLABS_SYSTEM"
    const val WhyLabsSystemScope = ":whylabs_system"

    // Role for all users that have been authenticated
    const val AuthenticatedRole = "AUTHENTICATED"
    const val AuthenticatedScope = ":authenticated"

    // Role type scopes granting access to multiple apis
    const val AccountAdministratorRole = "ACCOUNT_ADMINISTRATOR"
    const val AccountAdministratorScope = ":account_administrator"
    const val AdministratorRole = "ADMINISTRATOR"
    const val AdministratorScope = ":administrator"
    const val SecureContainerRole = "SECURE_CONTAINER"
    const val SecureContainerScope = ":secure_container"
    const val UserRole = "USER"
    const val UserScope = ":user"

    // Granular scopes for specific types of apis
    const val WriteDataRole = "WRITE_DATA"
    const val WriteDataScope = ":write_data"
    const val WriteNotificationRole = "WRITE_NOTIFICATION"
    const val WriteNotificationScope = ":write_notification"
    const val ReadNotificationRole = "READ_NOTIFICATION"
    const val ReadNotificationScope = ":read_notification"
    const val WriteResourceRole = "WRITE_RESOURCE"
    const val WriteResourceScope = ":write_resource"
    const val ReadResourceRole = "READ_RESOURCE"
    const val ReadResourceScope = ":read_resource"

    val ExternalRoleScopes = mapOf(
        AccountAdministratorScope to AccountAdministratorRole,
        AdministratorScope to AdministratorRole,
        AuthenticatedScope to AuthenticatedRole,
        SecureContainerScope to SecureContainerRole,
        UserScope to UserRole,
        WriteDataScope to WriteDataRole,
        WriteNotificationScope to WriteNotificationRole,
        ReadNotificationScope to ReadNotificationRole,
        WriteResourceScope to WriteResourceRole,
        ReadResourceScope to ReadResourceRole
    )

    val InternalRoleScopes = mapOf(
        WhyLabsAdministratorScope to WhyLabsAdministratorRole,
        WhyLabsSystemScope to WhyLabsSystemRole,
    )

    val AllRoleScopes = ExternalRoleScopes + InternalRoleScopes
    val SupportedExternalApiScopes = ExternalRoleScopes.keys
    val AllSupportedScopes = AllRoleScopes.keys

    val OrganizationUriRegex = Regex("/organizations/([^/]+)")
    val OrgNotificationSettingsUriRegex = Regex("/notification-settings/([^/]+)")
    val OrgUriRegex = Regex("/org/([^/]+)")

    fun resolveOrgFromUri(path: String): MatchResult? {
        // TODO reconcile with audit logging that gets any param org_id from the path
        val uriRegexes = listOf(
            OrganizationUriRegex,
            OrgNotificationSettingsUriRegex,
            OrgUriRegex,
        )

        return uriRegexes.firstNotNullOfOrNull { it.find(path) }
    }
}

object Claims {
    const val Organization = "organization"
    const val ExpirationTime = "expirationTime"
    const val Roles = "roles"
    const val Scopes = "scopes"
    const val Key = "key"
}
