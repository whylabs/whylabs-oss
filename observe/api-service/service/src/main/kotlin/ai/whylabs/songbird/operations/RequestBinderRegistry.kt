package ai.whylabs.songbird.operations

import io.micronaut.context.annotation.Replaces
import io.micronaut.core.convert.ConversionService
import io.micronaut.http.bind.DefaultRequestBinderRegistry
import io.micronaut.http.bind.binders.RequestArgumentBinder
import jakarta.inject.Singleton

@Singleton
@Replaces(DefaultRequestBinderRegistry::class)
class RequestBinderRegistry(conversionService: ConversionService<*>?, binders: List<RequestArgumentBinder<*>?>?) :
    DefaultRequestBinderRegistry(conversionService, binders) {
    init {
        addRequestArgumentBinder(StrictQueryValueBinder<Any>(conversionService))
    }
}
