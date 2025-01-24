package ai.whylabs.dataservice.models;

import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;

@Entity
@Data
public class MonitorAndAnomalyCount {
  @Id String monitorId;
  Long anomaliesCount;
  Long totalCount;
}
