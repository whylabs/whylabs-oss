package ai.whylabs.songbird.operations

import io.micronaut.core.bind.ArgumentBinder.BindingResult
import io.micronaut.core.convert.ArgumentConversionContext
import io.micronaut.core.convert.ConversionError
import io.micronaut.core.convert.ConversionService
import io.micronaut.http.bind.binders.QueryValueArgumentBinder
import java.util.Optional

class StrictQueryValueBinder<T>(conversionService: ConversionService<*>?) : QueryValueArgumentBinder<T>(conversionService) {
    override fun doConvert(
        value: Any?,
        context: ArgumentConversionContext<T>,
        defaultResult: BindingResult<T>
    ): BindingResult<T> {
        if (value == null && context.hasErrors()) {
            return object : BindingResult<T> {
                override fun getValue(): Optional<T> {
                    return defaultResult.value
                }

                override fun isSatisfied(): Boolean {
                    return false
                }

                override fun getConversionErrors(): List<ConversionError> {
                    val errors: MutableList<ConversionError> = ArrayList()
                    for (error in context) {
                        errors.add(error)
                    }
                    return errors
                }
            }
        } else {
            return super.doConvert(value, context, defaultResult)
        }
    }
}
