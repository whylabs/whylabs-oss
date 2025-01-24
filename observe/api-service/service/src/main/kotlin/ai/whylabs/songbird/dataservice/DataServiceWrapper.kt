package ai.whylabs.songbird.dataservice

import ai.whylabs.dataservice.invoker.ApiException
import ai.whylabs.songbird.operations.ResourceNotFoundException
import com.google.gson.Gson
import jakarta.inject.Singleton

class DataServiceErrorMessage(
    val message: String?
)
class DataServiceErrors(
    val errors: List<DataServiceErrorMessage>?
)
class DataServiceErrorBody(
    val _embedded: DataServiceErrors?
)
@Singleton
class DataServiceWrapper {
    companion object {
        fun <X> tryCall(apiCall: () -> X): X =
            try {
                apiCall()
            } catch (e: ApiException) {
                try {
                    // extract the validation error message that's usually embedded in the response body
                    val body = Gson().fromJson(e.responseBody, DataServiceErrorBody::class.java)
                    val message = body?._embedded?.errors?.map { it.message }?.joinToString(", ")
                    if (e.code == 400) {
                        throw IllegalArgumentException(message ?: e.message)
                    }
                    if (e.code == 404) {
                        throw ResourceNotFoundException(message ?: e.message ?: "Resource not found")
                    }
                    throw e
                } catch (e: Exception) {
                    throw e
                }
            }
    }
}
