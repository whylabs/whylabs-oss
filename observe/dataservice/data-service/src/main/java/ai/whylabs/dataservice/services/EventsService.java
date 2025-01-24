package ai.whylabs.dataservice.services;

import ai.whylabs.core.configV3.structure.CustomerEvent;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.responses.GetCustomerEventsResponse;
import ai.whylabs.dataservice.util.DatasourceConstants;
import io.micronaut.context.annotation.Executable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.inject.Singleton;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import javax.inject.Inject;
import javax.inject.Named;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;

@Slf4j
@Singleton
@Repository
public class EventsService {

  private final String customerEventsUpsert;

  @Inject private final DataSvcConfig config;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  public EventsService(DataSvcConfig config) throws IOException {
    this.config = config;
    this.customerEventsUpsert =
        IOUtils.resourceToString("/sql/customer-events-upsert.sql", StandardCharsets.UTF_8);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  @Operation(operationId = "SaveEvents")
  public int saveCustomerEvent(String orgId, String datasetId, CustomerEvent customerEvent) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    return upsertEvent(db, orgId, datasetId, customerEvent);
  }

  @SneakyThrows
  private int upsertEvent(
      Connection db, String orgId, String datasetId, CustomerEvent customerEvent) {
    @Cleanup PreparedStatement pst = db.prepareStatement(customerEventsUpsert);
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    pst.setString(3, customerEvent.getUserId());
    pst.setString(4, customerEvent.getEventType());
    pst.setTimestamp(5, new Timestamp(customerEvent.getEventTimestamp()));
    if (customerEvent.getDescription() != null) {
      pst.setString(6, customerEvent.getDescription());
    } else {
      pst.setNull(6, java.sql.Types.VARCHAR);
    }

    try {
      ResultSet response = pst.executeQuery();
      response.next();
      return response.getInt(1);
    } catch (SQLException e) {
      log.error("Failed to upsert customer event", e);
      throw e;
    }
  }

  @SneakyThrows
  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  public GetCustomerEventsResponse loadEvents(
      String orgId, String datasetId, Long startDate, Long endDate, Integer limit, Integer offset) {
    @Cleanup Connection db = bulkDatasource.getConnection();

    PreparedStatement pst =
        db.prepareStatement(
            "SELECT * FROM whylabs.customer_events WHERE org_id = ? AND dataset_id = ? AND event_timestamp >= ? AND event_timestamp <= ? ORDER BY event_timestamp DESC LIMIT ? OFFSET ?");
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    pst.setTimestamp(3, new Timestamp(startDate));
    pst.setTimestamp(4, new Timestamp(endDate));
    pst.setInt(5, limit);
    pst.setInt(6, offset);

    ResultSet response = pst.executeQuery();

    if (!response.next()) {
      return null;
    }

    List<CustomerEvent> customerEventsList = new ArrayList<>();
    do {
      CustomerEvent customerEvent = new CustomerEvent();
      customerEvent.setUserId(response.getString("user_id"));
      customerEvent.setEventType(response.getString("event_type"));
      customerEvent.setEventTimestamp(response.getTimestamp("event_timestamp").getTime());
      customerEvent.setDescription(response.getString("description"));
      customerEventsList.add(customerEvent);
    } while (response.next());

    return GetCustomerEventsResponse.builder().customerEvents(customerEventsList).build();
  }
}
