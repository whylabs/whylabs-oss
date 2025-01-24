package ai.whylabs.songbird.v1.controllers

import ai.whylabs.dataservice.model.CustomerEventsRequest
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/events")
@Tags(
    Tag(name = "Events", description = "Endpoint to handle customer events."),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class EventsController @Inject constructor(
    private val dataService: DataService
) : JsonLogging {

    @Operation(
        operationId = "SaveEvent",
        summary = "Endpoint to save an event",
        description = "Endpoint to save an event"
    )
    @Post(
        uri = "/",
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun uploadEvent(
        @QueryValue org_id: String,
        @QueryValue dataset_id: String,
        @Body event: CustomerEvent
    ) {
        dataService.eventsApi.storeCustomerEvent(org_id, dataset_id, event.toDataServiceCustomerEvent())
    }

    @Operation(
        operationId = "GetEvents",
        summary = "Endpoint to get all events",
        description = "Endpoint to get all events"
    )
    @Get(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON],
    )
    fun getEvents(
        @QueryValue org_id: String,
        @QueryValue dataset_id: String,
        @QueryValue start_date: Long? = null,
        @QueryValue end_date: Long? = null,
        @QueryValue limit: Int? = 100,
        @QueryValue offset: Int? = 0
    ): GetEventsResponse {
        val customerEventReq = CustomerEventsRequest()
            .startDate(start_date ?: 0)
            .endDate(end_date ?: System.currentTimeMillis())
            .limit(limit ?: 100)
            .offset(offset ?: 0)
        val customerEvents = dataService.eventsApi.loadCustomerEvents(org_id, dataset_id, customerEventReq).customerEvents

        return GetEventsResponse(
            events = customerEvents.map { CustomerEvent.fromDataServiceCustomerEvent(it) }
        )
    }
}

data class CustomerEvent(
    val userId: String,
    val eventType: String,
    val eventTimestamp: Long,
    val description: String?
) {

    fun toDataServiceCustomerEvent(): ai.whylabs.dataservice.model.CustomerEvent {
        return ai.whylabs.dataservice.model.CustomerEvent()
            .userId(userId)
            .eventType(eventType)
            .eventTimestamp(eventTimestamp)
            .description(description)
    }

    companion object {
        fun fromDataServiceCustomerEvent(dataServiceCustomerEvent: ai.whylabs.dataservice.model.CustomerEvent): CustomerEvent {
            return CustomerEvent(
                userId = dataServiceCustomerEvent.userId,
                eventType = dataServiceCustomerEvent.eventType,
                eventTimestamp = dataServiceCustomerEvent.eventTimestamp,
                description = dataServiceCustomerEvent.description
            )
        }
    }
}

data class GetEventsResponse(
    val events: List<CustomerEvent>
)
