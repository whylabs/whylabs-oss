package ai.whylabs.dataservice.controllers;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.metrics.result.DataEvaluationResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hamcrest.number.IsCloseTo;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

@MicronautTest
@Slf4j
public class MetricControllerTest extends BasePostgresTest {

  @Inject private ObjectMapper objectMapper;

  @Inject
  @Client("/")
  HttpClient httpClient;

  @BeforeAll
  void setUp() {
    // ingesting two segmented reference profiles ('my-ref-profile', 'another-ref-profile')
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-20BXhjsxOu30G6AU2wE5hg14WgJBD4Cl.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-Anu6A6qMyERZOOQLrt4QIqdPXrks8mBF.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-ap4HxjNdaneRmjcRfgrCBoZpF6qA2ffK.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-aSmlhO5VTOllT5AJEX06zs4har5YMovr.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-bBdoufWuSXbKfmgrFmovzqs0bkXargXX.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-bQxd6BkkqTEU12SwftTBbURqA7MsvcGA.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-bvW10NrW3Nxs9ITSmazAMEd6v0vkQcNN.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-BWn0893O0C7NmjYGlLIM86SOvE20E1Fp.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-eYCbq6GBTUvM3hZBcB8wjR8P2Htux00a.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-l5y8jYh2qKpgVRkmoUc3WFFIMzJsZobZ.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-mOZ54mnpFtv3a0zPgH7nES4IFdBCgTUo.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-N1jFqwotQjxtDAQ7ETwZQk66Ea3RDxDW.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-pIbYhSDhGBZlvy2PfMCnenhczrH29mM3.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-pXvAwlbonEeySgKH1oZBfkfdc1V7sRp2.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-q9y6WY7O7zPUhPBUYSsZvD8QWQyvL70w.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-qXTNr0UC65btQyhKqG8VGEPoJiwtPwqY.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-rohPivOjBc0q5CRmvNT06Q42vJQEdto7.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-rqXtyMVZbXbDOJPxzhJNJ4qTcQlq5jyj.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-sDkQDI7o2g1jjXli8cYoziI8Mzn8Xghq.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-ump19b8twRxfXtgyfFGg6jU38rNkiNgi.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-wCe86MYC4C4BEN4aB66Bfju7HzXtughX.bin");
    ingestProfile(
        "/profiles/segmented/rankingModel/org-0-model-2347-yPsFdTPKAAjkpjppaCa0uBkINFESnH3v.bin");
    log.info("Ingested reference profiles");

    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-1Z0GalznSgw3gIpRk9DHNzaXsmlNZ5jl.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-2FcNiiPfJoUEJC51bt5Zd5EZmzCxKPW6.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-2KQs2L8s7ux78BDqKmS417NIqlzpNmnR.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-5ax3x4OQ6ISs00nckVf99OJfy7rdauOi.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-8MqWXf8w42qNRk2ojEdUS0YtVhcFoR8M.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-83MkpgohVwU3bxQ92215Vv9BTQz5conQ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-aqHbn9gZQ9IDRAsKIIYUORZMAAWR9wKk.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-crkdmJ57XPtqEjYXvvrqeAk29XNUH6ZC.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-d56G1LKUSG5DTM1Bf74qSOkbulOSACFV.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-faNluPHymv1vC2EwxjThsjvIuWTwstaJ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-fgf1BdU5apD17sh8s9FZq0WVu1SxYKd8.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-hzuDCYucbT8cCkyEXoGBIS05KYCysfFK.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-i6o9BKe0oJcj9v3muY6e7O7WHj6mNAjF.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-itb1vrP39dCBBg6K4V7Epd8NgMqoVJ52.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-IuDNWU4iqwGS7tDBQ9kmodyXD9irLdST.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-jCyomLn0ISbnmAG0tZ8Nj6Kz4mf8gSKJ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-LQ0nY79k5DJ8YyAo06hGefLGRTMiVfBm.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-mjY2RJ8CuaPQMT0HaL2mlA2lv0VHrNI4.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-mmg4vsVDWpL9tvQwvHZhv9Jcc7NOWiHK.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-MPjF6gYDDqYvEoiKGl23i8LfOvZIfVCr.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-ntpPhsFhSOsH3HAwJJ38FzdlOOA4Xc4m.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-PNTNDDw2NORYx9SZBgPChg0Wmgi8INwl.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-prLStbH201ZeJGYh9pn3KSBh3oaWyIbZ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-r7JpgLoy0LJuFy8f01DBhAJO3pp1Ipyt.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-rkYZ4Sho9intg7Ylfy8kbebyYfLzdxdb.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-SVxZGAh16Bf9M8lIhwW0iswOzjAWp5Bm.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-t8pK7hVDDbbv49XmpdcdU6xPfLNPafho.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-VbaOToI66NZ6pNsckxconlXJSCauFX1y.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-vHgDLG2ROlkWlzTKmLAEPRBlgTx9B0vl.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-vWalIoMoivsO44jn8kSrkE8entuOYGCA.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-yFkghLqN7uKlbqbMMx6ebJ7HkwOra8T7.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-07/org-0-model-0-2024-10-07T210425.402-ZV2Jf3q5aGEclX35TxiJuI79WSjE9asZ.bin");
    log.info("Ingested batch profiles 2024-10-07");

    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-2KpOptL4BiBASNHsauUwGXhEjDeRuL0F.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-4smEOFJlkFIIkcIhUYDx7xmsm97CcuYe.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-7Kn1rZhVrITj6znl1RlbegF0Dq8A8e1h.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-8lnw6CsQIvvmhToKQRRJE2GKpJhdntyx.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-8xyOiIjhD1ArrDliDZ7Tvvuh0xnFj1sJ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-a3A11ymHPKKX0wko7fmsFm6lzx58poiC.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-BltZ0zAdz7BY17JXgtcXafcg8dhT8qqw.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-DFteQ0t17EsdAtAPiiexLoVHBMOYSdTL.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-dPAVtATArGT6fjrAfPyhbKKcKSBz7BBC.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-DWCBDSXH3Z6AxeII14BsemrrC0gAURzX.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-eAaDIPx1RjLpgkwFTg2ASOsTzODep2vB.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-ew2GZWrkSbnxoH0pvi8LwgmvSDa5ZfIt.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-GfsX82c4rb9abROVLmA7kYTsubS6mxm9.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-GtWjBx46r2MUd8HDTWq0v76vpJYFLXr9.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-idjP1boZzyjKNsUaDietr2BALEWAenJq.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-j070RWOieWbgCZXCJYDOv6gEeMwzTbw9.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-Jsx2MvVnE854cCUGJHKbANK87cMljq2v.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-mbN3fbMVuszjtyklkgfWPFKAAajPM9kN.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-mFkOC8HpWBgZJEYr9c09hymCNXrdVV6V.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-mmm80p1o0K8S0Ssy6f3LKM3StUb8UaCJ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-MqF6LBMZATp6VfarKaJ5zrRimkHEeGbT.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-pcCpFlgYocUVTvivKVNuVBtnfABXR5eG.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-PzkbOE609Dz3NXjLV7vKPvs3l1TFCeLd.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-Q5ctk9iJVQWsGzhpnVTO7QM5Ts661IOv.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-RjI18fBSA3PdWgo7GVFoLmVxdm929HCP.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-s9qrFtX1eqlaPDPfg30thzgGSlqxuxdJ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-TGJJwCznWskhLX3gIp7rEnuc39v07ffo.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-TrhKgsf9AoZL2MpvtMKmGbqqy6vjGDGy.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-VpXo3i7MlhWrYHRjEmtPji4BfXmmITSQ.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-y7lEZSNmeEbPHP6LI5XRneedCEKuL9pU.bin");
    ingestProfile(
        "/profiles/segmented/lending_club/2024-10-08/org-0-model-0-2024-10-08T210547.349-YCYxC3FPeh01TOtEUlxwKUaOGKJ6o0lB.bin");
    log.info("Ingested batch profiles 2024-10-08");

    ingestProfile(
        "/profiles/classification-only/org-0-model-2120-2024-11-02T211026.746-cjWsCucxLK3IXphpRk6ceew9Lc78KyFf.bin");
    ingestProfile(
        "/profiles/classification-only/org-0-model-2120-2024-11-03T221026.631-5ognTtsSnv5sZHz0KLo9oLh2Qpl5t6d4.bin");
    log.info("Ingested batch profiles with performance metrics");
  }

  @SneakyThrows
  @Test
  void testSegmentRefProfilesComparison() {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("resources/SegmentRefProfileComparisonBody.json")),
            StandardCharsets.UTF_8);
    val client = httpClient.toBlocking();
    val postReq =
        HttpRequest.POST("/metrics/dataEvaluation/org-0", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, DataEvaluationResponse.class);
    String responseJson =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass()
                    .getResourceAsStream("resources/SegmentRefProfileComparisonResponse.json")),
            StandardCharsets.UTF_8);
    val expectedResponse = objectMapper.readValue(responseJson, DataEvaluationResponse.class);
    assertEntriesAreTheSame(resp, expectedResponse);
  }

  @SneakyThrows
  @Test
  void testOverallRefProfilesComparison() {
    runTest(
        "resources/OverallRefProfileComparisonBody.json",
        "resources/OverallRefProfileComparisonResponse.json");
  }

  @SneakyThrows
  @Test
  void testSegmentComparisonWithRowSegmentFilter() {
    runTest(
        "resources/SegmentComparisonWithSegmentFilterBody.json",
        "resources/SegmentComparisonWithSegmentFilterResponse.json");
  }

  @SneakyThrows
  @Test
  void testSegmentComparisonWithOverallRowAggregation() {
    runTest(
        "resources/SegmentComparisonForOverallRowGroupingBody.json",
        "resources/SegmentComparisonForOverallRowGroupingResponse.json");
  }

  @SneakyThrows
  @Test
  void testOverallAggBatchPerformanceEvaluation() {
    runTest(
        "resources/OverallAggBatchPerformanceComparisonBody.json",
        "resources/OverallAggBatchPerformanceComparisonResponse.json");
  }

  @SneakyThrows
  private void runTest(String bodyFilePath, String responseFilePath) {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(getClass().getResourceAsStream(bodyFilePath)),
            StandardCharsets.UTF_8);
    val client = httpClient.toBlocking();
    val postReq =
        HttpRequest.POST("/metrics/dataEvaluation/org-0", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, DataEvaluationResponse.class);
    String responseJson =
        IOUtils.toString(
            Objects.requireNonNull(getClass().getResourceAsStream(responseFilePath)),
            StandardCharsets.UTF_8);
    val expectedResponse = objectMapper.readValue(responseJson, DataEvaluationResponse.class);
    assertEntriesAreTheSame(resp, expectedResponse);
  }

  private void assertEntriesAreTheSame(
      DataEvaluationResponse response, DataEvaluationResponse expected) {
    assertEquals(response.getEntries().size(), expected.getEntries().size());
    response
        .getEntries()
        .forEach(
            entry -> {
              val foundExpectedEntry =
                  expected.getEntries().stream()
                      .filter(
                          it -> {
                            val isSameSegment = Objects.equals(it.getSegment(), entry.getSegment());
                            val isSameColumn =
                                Objects.equals(it.getColumnName(), entry.getColumnName());
                            val isSameMetric = Objects.equals(it.getMetric(), entry.getMetric());
                            return isSameSegment && isSameColumn && isSameMetric;
                          })
                      .findFirst()
                      .orElse(null);
              assertNotNull(foundExpectedEntry, "Response's entry not found on expected object");
              assertEquals(entry.getRowColumns().size(), foundExpectedEntry.getRowColumns().size());
              entry
                  .getRowColumns()
                  .forEach(
                      entryColumnMap -> {
                        entryColumnMap.forEach(
                            (columnKey, columnValue) -> {
                              val foundExpectedColumn =
                                  foundExpectedEntry.getRowColumns().stream()
                                      .filter(it -> it.containsKey(columnKey))
                                      .findFirst()
                                      .orElse(null);
                              assertNotNull(
                                  foundExpectedColumn,
                                  "Response's entry rowColumn not found on expected entry rowColumns object");
                              // asserting with small error factor to prevent sketches merging algo
                              // to intermittently break the tests
                              assertThat(
                                  columnValue,
                                  IsCloseTo.closeTo(foundExpectedColumn.get(columnKey), 0.00001));
                            });
                      });
            });
  }
}
