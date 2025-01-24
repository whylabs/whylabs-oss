package ai.whylabs.songbird.security

/**
 * Annotation to mark Admin APIs reserved for WhyLabs organization or
 * administrators of the organization
 */
@Target(
    AnnotationTarget.CLASS,
    AnnotationTarget.FUNCTION,
    AnnotationTarget.VALUE_PARAMETER
)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class AdminSecured

/**
 * Annotation to mark Admin APIs reserved for WhyLabs internal
 */
@Target(
    AnnotationTarget.CLASS,
    AnnotationTarget.FUNCTION,
    AnnotationTarget.VALUE_PARAMETER
)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class WhyLabsInternal
