package ai.whylabs.dataservice.services;

import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.requests.ResourceTag;
import ai.whylabs.dataservice.structures.Dataset;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.util.Set;
import java.util.UUID;
import javax.inject.Inject;
import lombok.val;
import org.junit.jupiter.api.Test;

@MicronautTest(transactional = false)
public class DatasetServiceTest extends BasePostgresTest {
  @Inject private DatasetService datasetService;

  private Dataset makeTest1Dataset() {
    val ds =
        Dataset.builder()
            .orgId("org-test1")
            .datasetId("dataset-test1")
            .granularity("P1D")
            .name("Test1 Dataset")
            .type("LLM")
            .active(Boolean.TRUE)
            .createdTs(Long.valueOf(1729873833000L))
            .build();
    return datasetService.persist(ds);
  }

  @Test
  public void testListActiveDatasets() {
    makeTest1Dataset();
    val datasets = datasetService.listDatasets("org-test1", Boolean.FALSE);
    assertFalse(datasets.isEmpty());
    assertTrue(datasets.stream().allMatch(Dataset::getActive));
  }

  @Test
  public void testDefaultActive() {
    val ds =
        Dataset.builder()
            .orgId("org-test1")
            .datasetId("dataset-test2")
            .granularity("P1D")
            .name("Test2 Dataset")
            .type("MODEL_OTHER")
            .build();
    datasetService.persist(ds);
    val dataset = datasetService.getDataset("org-test1", "dataset-test2");
    assertNotNull(dataset);
    val datasets = datasetService.listDatasets("org-test1", Boolean.FALSE);
    val result =
        datasets.stream().filter(d -> d.getDatasetId().equals("dataset-test2")).findFirst();
    assertFalse(result.isEmpty());
  }

  @Test
  public void testListAllDatasets() {
    val ds = makeTest1Dataset();
    ds.setActive(Boolean.FALSE);
    datasetService.persist(ds);
    val datasets = datasetService.listDatasets("org-test1", Boolean.TRUE);
    assertFalse(datasets.isEmpty());
  }

  @Test
  public void testGetDataset() {
    makeTest1Dataset();
    datasetService.getDataset("org-test1", "dataset-test1");
    val result = datasetService.getDataset("org-test1", "dataset-test1");
    // fields are as specified on persist
    assertEquals(result.getOrgId(), "org-test1");
    assertEquals(result.getDatasetId(), "dataset-test1");
    assertEquals(result.getGranularity(), "P1D");
    assertEquals(result.getName(), "Test1 Dataset");
    assertEquals(result.getType(), "LLM");
    assertEquals(result.getCreatedTs(), 1729873833000L);
    assertTrue(result.getActive());
  }

  @Test
  public void testPersistNew() {
    val randomDatasetId = UUID.randomUUID().toString();
    val dataset =
        Dataset.builder()
            .orgId("org-test1")
            .datasetId(randomDatasetId)
            .granularity("P1D")
            .name("Random new dataset")
            .type("CLASSIFICATION")
            .build();
    datasetService.persist(dataset);
    val now = System.currentTimeMillis();
    val result = datasetService.getDataset("org-test1", randomDatasetId);
    assertEquals(result.getOrgId(), dataset.getOrgId());
    assertEquals(result.getDatasetId(), dataset.getDatasetId());
    assertEquals(result.getGranularity(), dataset.getGranularity());
    assertEquals(result.getName(), dataset.getName());
    assertEquals(result.getType(), dataset.getType());
    // set created ts if not specified
    assertEquals(result.getCreatedTs(), now, 500);
    // default to active
    assertTrue(result.getActive());
  }

  @Test
  public void testUpdateExisting() {
    val dataset = makeTest1Dataset();
    datasetService.persist(
        Dataset.builder()
            .orgId(dataset.getOrgId())
            .datasetId(dataset.getDatasetId())
            .active(Boolean.FALSE)
            .build());
    val updated = datasetService.getDataset(dataset.getOrgId(), dataset.getDatasetId());
    // changed field has changed
    assertFalse(updated.getActive());
    // other fields remain the same
    assertEquals(updated.getName(), dataset.getName());
    // created ts should not change
    assertEquals(updated.getCreatedTs(), dataset.getCreatedTs());
  }

  @Test
  public void testSaveTags() {
    makeTest1Dataset();
    // need to delete tags in case they are left over from previous test - save is NOT idempotent
    datasetService.deleteResourceTags("org-test1", "dataset-test1", Set.of("key1", "key2"));
    datasetService.saveResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key1", "val1", null, null));
    datasetService.saveResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key2", "val2", null, null));
    val retrieved = datasetService.getDataset("org-test1", "dataset-test1");
    assertTrue(retrieved.getTags().size() >= 2);
    val key1Tag = retrieved.getTags().stream().filter(t -> t.getKey().equals("key1")).findFirst();
    assertTrue(key1Tag.isPresent());
    assertEquals(key1Tag.get().getValue(), "val1");
  }

  @Test
  public void testDeleteTag() {
    makeTest1Dataset();
    datasetService.replaceResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key1", "val1", null, null));
    datasetService.replaceResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key2", "val2", null, null));
    datasetService.deleteResourceTags("org-test1", "dataset-test1", Set.of("key1"));
    val retrieved = datasetService.getDataset("org-test1", "dataset-test1");
    val key1Tag = retrieved.getTags().stream().filter(t -> t.getKey().equals("key1")).findFirst();
    val key2Tag = retrieved.getTags().stream().filter(t -> t.getKey().equals("key2")).findFirst();
    assertFalse(key1Tag.isPresent());
    assertTrue(key2Tag.isPresent());
    assertEquals(key2Tag.get().getValue(), "val2");
  }

  @Test
  public void testListTags() {
    makeTest1Dataset();
    datasetService.replaceResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key1", "val1", null, null));
    datasetService.replaceResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key1", "updated", null, null));
    val tags = datasetService.listResourceTags("org-test1", "dataset-test1");
    val key1Tag = tags.stream().filter(t -> t.getKey().equals("key1")).findFirst();
    assertTrue(key1Tag.isPresent());
    assertEquals(key1Tag.get().getValue(), "updated");
  }

  @Test
  public void testDeleteReplaceTags() {
    makeTest1Dataset();
    datasetService.deleteResourceTags("org-test1", "dataset-test1", Set.of("key1"));
    datasetService.replaceResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key1", "val1", null, null));
    datasetService.replaceResourceTag(
        new ResourceTag("org-test1", "dataset-test1", "key1", "updated", null, null));
    val tags = datasetService.listResourceTags("org-test1", "dataset-test1");
    val key1Tag = tags.stream().filter(t -> t.getKey().equals("key1")).findFirst();
    assertTrue(key1Tag.isPresent());
    assertEquals(key1Tag.get().getValue(), "updated");
  }
}
