package ai.whylabs.songbird.operations

open class ResourceException(val resource: String, val id: String?, msg: () -> String) : Exception(msg.invoke())
open class ResourceNotFoundException(resource: String, id: String? = null, message: String? = null) :
    ResourceException(
        resource,
        id,
        {
            "Resource $resource" + (id?.let { " with ID $it not found." } ?: ".") +
                message?.let { " Additional information: $it" }
                    .orEmpty()
        }
    )

open class ResourceConstraintException(resource: String, id: String? = null, message: String? = null) :
    ResourceException(
        resource,
        id,
        {
            "Resource $resource" + (id?.let { " with ID $it has constraints." } ?: ".") +
                message?.let { " Additional information: $it" }
                    .orEmpty()
        }
    )

open class ArgumentValueException(message: String, val parameter: String) :
    IllegalArgumentException(message)

class EmptyResourceException(resource: String, id: String) :
    ResourceException(resource, id, { "Resource $resource with ID $id is empty" })

open class ResourceAlreadyExistsException(resource: String, id: String? = null, message: String? = null) :
    ResourceException(
        resource,
        id,
        {
            "Resource $resource" + (id?.let { " with ID $it already exists." } ?: ".") +
                message?.let { " Additional information: $it" }
                    .orEmpty()
        }
    )

class PermanentlyRemovedException(s: String) : RuntimeException(s)

class NotImplementedException(s: String) : RuntimeException(s)
