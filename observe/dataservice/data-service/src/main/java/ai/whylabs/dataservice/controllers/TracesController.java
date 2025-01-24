package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.models.*;
import ai.whylabs.dataservice.services.TraceEmbeddingService;
import com.fasterxml.jackson.databind.JsonNode;
import com.google.common.collect.ImmutableList;
import com.microsoft.azure.kusto.data.Client;
import com.microsoft.azure.kusto.data.ClientRequestProperties;
import com.microsoft.azure.kusto.data.KustoOperationResult;
import com.microsoft.azure.kusto.data.KustoResultSetTable;
import io.micronaut.context.annotation.Property;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Header;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Optional;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.DateTimeUtils;

@Slf4j
@Tag(name = "Traces", description = "Traces endpoints")
@Controller("/traces")
@RequiredArgsConstructor
public class TracesController {
  @Inject private Client client;

  @Inject private final TraceEmbeddingService traceEmbeddingService;

  private static final String TRACELISTVIEW_FIELD_PROJECTION =
      "| project OrgId, ResourceId, TraceId, Tags, Actions, "
          + "TotalTokens=array_sum(TotalTokensList), "
          + "CompletionTokens=array_sum(CompletionTokensList), "
          + "PromptTokens=array_sum(PromptTokensList), PolicyIssues=array_length(Tags),"
          + "Events=array_length(EventsList), EventsList, Latency=array_sum(LatencyList), "
          + "StartTime, EndTime, ResourceAttributes, Version, ApplicationId, HasCoords=HasPcaCoordinates has_any (True)";

  private static final String EMBEDDINGS_FIELD_PROJECTION =
      "| project SpanId, TraceId, Events, StartTime, "
          + "Metrics=TraceAttributes['whylabs.secure.metrics'], Scores=TraceAttributes['whylabs.secure.score'], TraceMetadata=TraceAttributes['whylabs.secure.metadata']\n"
          + "| extend PromptCoords=parse_json(tostring(Metrics['prompt.pca.coordinates'])), "
          + "ResponseCoords=parse_json(tostring(Metrics['response.pca.coordinates']))";

  /*
   * These scores are used on TraceEmbeddingService to get relevant datasets for embeddings violations,
   * It will be replaced by some container metadata eventually
   */
  private static final String EMBEDDINGS_EXPAND_SCORES =
      "| extend MisuseScore = coalesce(parse_json(tostring(Scores[strcat(Type, \".score.misuse\")])), dynamic(0)), "
          + "CustomerExperienceScore = coalesce(parse_json(tostring(Scores[strcat(Type, \".score.customer_experience\")])), dynamic(0)), "
          + "ToxicityScore = coalesce(parse_json(tostring(Scores[strcat(Type, \".score.customer_experience.response.toxicity.toxicity_score\")])), dynamic(0)), "
          + "MedicalTopicScore = coalesce(parse_json(tostring(Scores[strcat(Type, \".score.misuse.prompt.topics.medical\")])), dynamic(0)), "
          + "CodeTopicScore = coalesce(parse_json(tostring(Scores[strcat(Type, \".score.misuse.prompt.topics.code\")])), dynamic(0)), "
          + "LegalTopicScore = coalesce(parse_json(tostring(Scores[strcat(Type, \".score.misuse.prompt.topics.legal\")])), dynamic(0)), "
          + "FinancialTopicScore = coalesce(parse_json(tostring(Scores[strcat(Type, \".score.misuse.prompt.topics.financial\")])), dynamic(0))\n";

  private static final String EMBEDDINGS_EXPAND_CLAUSES =
      "| mv-expand with_itemindex=['Type'] Coords=pack_array(PromptCoords, ResponseCoords)\n"
          + "| extend Type=iff(Type == 0, 'prompt', 'response')\n"
          + "| where isnotempty(Coords)\n"
          + "| extend ExpandedEvents = iff(array_length(Events) == 0, dynamic(null), Events)\n"
          + "| extend EmbeddingMetadata=parse_json(tostring(TraceMetadata[strcat(Type, '.pca.coordinates')]))\n"
          + "| extend DataVersion=EmbeddingMetadata['data_version']\n"
          + "| extend DataTag=EmbeddingMetadata['data_tag']\n"
          + "| extend DataMajorVersion=coalesce(EmbeddingMetadata['data_major_version'], dynamic(0))\n"
          + EMBEDDINGS_EXPAND_SCORES;

  private static final String EMBEDDINGS_SCORES_SUMMARIZE =
      ", MisuseScore=take_any(MisuseScore), CustomerExperienceScore=take_any(CustomerExperienceScore), ToxicityScore=take_any(ToxicityScore), "
          + "MedicalTopicScore=take_any(MedicalTopicScore), CodeTopicScore=take_any(CodeTopicScore), LegalTopicScore=take_any(LegalTopicScore), "
          + "FinancialTopicScore=take_any(FinancialTopicScore)";

  private static final String EMBEDDINGS_SUMMARIZE_STATEMENT =
      "| summarize Events = make_list(ExpandedEvents), Coords=make_list(Coords, 3), "
          + "DataVersion=take_any(DataVersion), DataTag=take_any(DataTag), DataMajorVersion=take_any(DataMajorVersion)"
          + EMBEDDINGS_SCORES_SUMMARIZE
          + " by TraceId, SpanId, Type";

  private static final String TRACES_DETAILS_EXTENDED_ATTRIBUTES =
      "| extend Tags=parse_json(tostring(coalesce(TraceAttributes['whylabs.secure.tags'], TraceAttributes['langkit.insights.tags'], dynamic([])))),"
          + ("Metrics=TraceAttributes['whylabs.secure.metrics']\n"
              + "| extend PromptCoords=parse_json(tostring(Metrics['prompt.pca.coordinates'])), ResponseCoords=parse_json(tostring(Metrics['response.pca.coordinates']))\n"
              + "| extend HasCoords=isnotempty(PromptCoords) or isnotempty(ResponseCoords)\n"
              + "| project-away Metrics, PromptCoords, ResponseCoords\n"
              + "| extend PackedRecord = pack_all()");

  @Inject
  @Property(name = "whylabs.dataservice.azure.kusto.database")
  private String databaseName;

  @SneakyThrows
  private ClientRequestProperties generateClientRequestProperties(String identity) {
    val clientRequestProperties = new ClientRequestProperties();
    clientRequestProperties.setApplication("dataservice");
    clientRequestProperties.setOption("request_readonly", "true");
    clientRequestProperties.setOption(
        "request_user", Optional.ofNullable(identity).orElse("anonymous"));
    clientRequestProperties.setOption("query_results_cache_max_age", "00:05:00");
    return clientRequestProperties;
  }

  @SneakyThrows
  @Get(uri = "/resources/{orgId}", produces = MediaType.APPLICATION_JSON)
  public OrgTraceResourceListResponse listTraceResources(
      @PathVariable String orgId,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {

    val clientRequestProperties = generateClientRequestProperties(identity);
    clientRequestProperties.setParameter("orgId", orgId);
    clientRequestProperties.setOption("query_results_cache_force_refresh", "true");

    // parameters
    val declaredParams = ImmutableList.<String>builder().add("orgId:string").build();
    val mainDeclarations = String.join(",", declaredParams);

    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val queryBuild =
        ImmutableList.<String>builder() //
            .add(declareParamStatement)
            .add("TraceDataRange")
            .add("| where OrgId == orgId")
            .add("| project OrgId, ResourceId, MinStartTime, MaxStartTime")
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();

    val builder = OrgTraceResourceListResponse.builder();

    while (mainTableResult.next()) {
      val entry =
          TraceDataRangeEntry.builder()
              .resourceId(mainTableResult.getString(1))
              .maxStartTime(
                  mainTableResult.getKustoDateTime(3).toInstant(ZoneOffset.UTC).toEpochMilli())
              .minStartTime(
                  mainTableResult.getKustoDateTime(2).toInstant(ZoneOffset.UTC).toEpochMilli())
              .build();
      builder.entry(entry);
    }
    return builder.build();
  }

  @SneakyThrows
  @Post(uri = "/dataRange", produces = MediaType.APPLICATION_JSON)
  public TraceDataRangeResponse traceDataRange(
      @Body TraceDataRangeRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {

    val clientRequestProperties = generateClientRequestProperties(identity);
    clientRequestProperties.setParameter("orgId", request.getOrgId());
    clientRequestProperties.setParameter("resourceId", request.getResourceId());
    clientRequestProperties.setOption("query_results_cache_force_refresh", "true");

    // parameters
    val declaredParams = request.applyQueryParams(clientRequestProperties);
    val mainDeclarations = String.join(",", declaredParams);

    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val queryBuild =
        ImmutableList.<String>builder() //
            .add(declareParamStatement)
            .add("TraceDataRange")
            .addAll(request.buildWhereClauses())
            .add("| project OrgId, ResourceId, MinStartTime, MaxStartTime")
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val builder = TraceDataRangeResponse.builder();
    builder.orgId(request.getOrgId());
    builder.resourceId(request.getResourceId());
    if (mainTableResult.next()) {
      builder.hasTraceData(true);
      builder.maxStartTime(
          mainTableResult.getKustoDateTime(3).toInstant(ZoneOffset.UTC).toEpochMilli());
      builder.minStartTime(
          mainTableResult.getKustoDateTime(2).toInstant(ZoneOffset.UTC).toEpochMilli());
    } else {
      builder.hasTraceData(false);
    }
    return builder.build();
  }

  @SneakyThrows
  @Post(uri = "/embeddings/filter", produces = MediaType.APPLICATION_JSON)
  public TraceEmbeddingsResponse embeddingsByTraceListFilter(
      @Body EmbeddingsFilterRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {

    val clientRequestProperties = generateClientRequestProperties(identity);
    clientRequestProperties.setParameter("orgId", request.getOrgId());
    clientRequestProperties.setParameter("resourceId", request.getResourceId());
    clientRequestProperties.setOption("query_results_cache_force_refresh", "true");

    // parameters
    val declaredParams = request.applyQueryParams(clientRequestProperties);
    val mainDeclarations = String.join(",", declaredParams);

    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val sortOrder = Optional.ofNullable(request.getAsc()).orElse(false) ? "asc" : "desc";
    val limit = Math.min(Optional.ofNullable(request.getLimit()).orElse(1000), 1000);
    val offset =
        Math.min(
            Optional.ofNullable(request.getOffset()).orElse(0),
            traceEmbeddingService.MAX_TRACE_EMBEDDINGS_OFFSET);

    val queryBuild =
        ImmutableList.<String>builder()
            .add(declareParamStatement)
            .add("TraceListViewV2") // we want to display embeddings for all the filtered traces
            // across pages, so we don't want to paginate this part of the query
            .addAll(request.buildWhereClauses())
            .add(
                "| project TraceId, Tags, Actions, ResourceAttributes, Latency=array_sum(LatencyList), "
                    + "PromptTokens=array_sum(PromptTokensList), TotalTokens=array_sum(TotalTokensList), "
                    + "CompletionTokens=array_sum(CompletionTokensList)")
            .addAll(request.buildFilterClauses())
            .add("| distinct DistinctTraceId=TraceId")
            .add("| join kind=inner (traces")
            .addAll(request.buildWhereClauses())
            .addAll(request.buildSpanFilterClauses())
            .add(EMBEDDINGS_FIELD_PROJECTION)
            .add(") on $left.DistinctTraceId == $right.TraceId") // end of inner join
            .add(String.format("| order by StartTime %s, TraceId, SpanId", sortOrder))
            .add(EMBEDDINGS_EXPAND_CLAUSES)
            .addAll(request.buildSpanEmbeddingsFilterClauses())
            .add(EMBEDDINGS_SUMMARIZE_STATEMENT)
            .add("| serialize RowId=row_number()")
            .add("| where RowId > " + offset)
            .add("| limit " + (limit + 1)) // Adding one to check if it's partial
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val embeddingsFilter =
        Optional.ofNullable(request.getSpanFilter()).orElse(TraceSpanFilter.builder().build());
    return traceEmbeddingService.processEmbeddingsResponse(
        mainTableResult, limit, offset, embeddingsFilter);
  }

  @SneakyThrows
  @Post(uri = "/embeddings", produces = MediaType.APPLICATION_JSON)
  public TraceEmbeddingsResponse traceEmbeddings(
      @Body TraceEmbeddingsRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {

    val clientRequestProperties = generateClientRequestProperties(identity);
    clientRequestProperties.setParameter("orgId", request.getOrgId());
    clientRequestProperties.setParameter("resourceId", request.getResourceId());
    clientRequestProperties.setOption("query_results_cache_force_refresh", "true");

    // parameters
    val declaredParams = request.applyQueryParams(clientRequestProperties);
    val mainDeclarations = String.join(",", declaredParams);

    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val sortOrder = Optional.ofNullable(request.getAsc()).orElse(false) ? "asc" : "desc";
    val limit = Math.min(Optional.ofNullable(request.getLimit()).orElse(1000), 1000);
    val offset =
        Math.min(
            Optional.ofNullable(request.getOffset()).orElse(0),
            traceEmbeddingService.MAX_TRACE_EMBEDDINGS_OFFSET);

    val queryBuild =
        ImmutableList.<String>builder()
            .add(declareParamStatement)
            .add("traces")
            .addAll(request.buildWhereClauses())
            .addAll(request.buildSpanFilterClauses())
            .add(String.format("| order by StartTime %s, TraceId, SpanId", sortOrder))
            .add(EMBEDDINGS_FIELD_PROJECTION)
            .add(EMBEDDINGS_EXPAND_CLAUSES)
            .addAll(request.buildSpanEmbeddingsFilterClauses())
            .add(EMBEDDINGS_SUMMARIZE_STATEMENT)
            .add("| serialize RowId=row_number()")
            .add("| where RowId > " + offset)
            .add("| limit " + (limit + 1)) // Adding one to check if it's partial
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val embeddingsFilter =
        Optional.ofNullable(request.getFilter()).orElse(TraceSpanFilter.builder().build());
    return traceEmbeddingService.processEmbeddingsResponse(
        mainTableResult, limit, offset, embeddingsFilter);
  }

  @SneakyThrows
  @Post(
      uri = "/summary/tags",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public TraceSummaryResponse tagSummary(
      @Body TraceSummaryRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {

    val clientRequestProperties = generateClientRequestProperties(identity);
    clientRequestProperties.setParameter("orgId", request.getOrgId());
    clientRequestProperties.setParameter("resourceId", request.getResourceId());

    // parameters
    val declaredParams = request.applyQueryParams(clientRequestProperties);
    val mainDeclarations = String.join(",", declaredParams);
    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val queryBuild =
        ImmutableList.<String>builder() //
            .add(declareParamStatement)
            .add("TraceListViewV2")
            .addAll(request.buildWhereClauses())
            .add(
                "| project tags=Tags, StartTime, "
                    + String.format(
                        "dateTime=((todatetime(strcat(format_datetime(StartTime, '%s'), '%s')) - datetime(1970-01-01)) / 1ms)",
                        request.getGranularityDateTime().getLeft(),
                        request.getGranularityDateTime().getRight()))
            .add("| mv-expand tags to typeof(string)")
            .add("| summarize count=count(tags) by dateTime, tags")
            .add("| order by dateTime asc")
            .add("| extend PackedRecord = pack_all()")
            .add("| project Entry=PackedRecord")
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val builder = TraceSummaryResponse.builder();
    while (mainTableResult.next()) {
      builder.entry(mainTableResult.getString(0));
    }
    return builder.build();
  }

  @SneakyThrows
  @Post(
      uri = "/summary",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public TraceSummaryResponse summary(
      @Body TraceSummaryRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {

    val clientRequestProperties = generateClientRequestProperties(identity);
    clientRequestProperties.setParameter("orgId", request.getOrgId());
    clientRequestProperties.setParameter("resourceId", request.getResourceId());

    // parameters
    val declaredParams = request.applyQueryParams(clientRequestProperties);
    val mainDeclarations = String.join(",", declaredParams);
    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val queryBuild =
        ImmutableList.<String>builder() //
            .add(declareParamStatement)
            .add("TraceListViewV2")
            .addAll(request.buildWhereClauses())
            .add(TRACELISTVIEW_FIELD_PROJECTION)
            .add(
                "| summarize total=count(TraceId), "
                    + "totalWithPolicyIssues=countif(array_length(Tags) != 0), "
                    + "totalBlocked=countif(set_has_element(Actions, \"block\")), "
                    + "totalTokens=sum(TotalTokens), "
                    + String.format(
                        "totalLatencyMillis=sum(Latency) by dateTime=(todatetime(strcat(format_datetime(StartTime, '%s'), '%s')) - datetime(1970-01-01)) / 1ms",
                        request.getGranularityDateTime().getLeft(),
                        request.getGranularityDateTime().getRight()))
            .add("| order by dateTime asc")
            .add("| extend PackedRecord = pack_all()")
            .add("| project Entry=PackedRecord")
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val builder = TraceSummaryResponse.builder();
    while (mainTableResult.next()) {
      builder.entry(mainTableResult.getString(0));
    }
    return builder.build();
  }

  @SneakyThrows
  @Post(
      uri = "/detail",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public TraceDetailResponse detail(
      @Body TraceDetailRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {

    val clientRequestProperties = generateClientRequestProperties(identity);
    clientRequestProperties.setParameter("orgId", request.getOrgId());
    clientRequestProperties.setParameter("resourceId", request.getResourceId());
    clientRequestProperties.setParameter("traceId", request.getTraceId());

    val sortOrder = Optional.ofNullable(request.getAsc()).orElse(false) ? "asc" : "desc";

    val queryBuild =
        ImmutableList.<String>builder() //
            .add("declare query_parameters(orgId:string,resourceId:string,traceId:string);")
            .add("traces")
            .add("| where OrgId == orgId")
            .add("| where ResourceId == resourceId")
            .add("| where TraceId == traceId")
            .add(String.format("| order by StartTime %s, TraceId, SpanId", sortOrder))
            .add(TRACES_DETAILS_EXTENDED_ATTRIBUTES)
            .add(
                "| project RowId=row_number(), ResourceAttributes, Entry=PackedRecord, StartTime, EndTime, Tags,"
                    + "TotalTokens=parse_json(tostring(TraceAttributes['llm.usage.total_tokens'])), "
                    + "CompletionTokens=parse_json(tostring(TraceAttributes['llm.usage.completion_tokens'])), "
                    + "PromptTokens=parse_json(tostring(TraceAttributes['llm.usage.prompt_tokens'])), "
                    + "ParentId, Latency=datetime_diff('millisecond', EndTime, StartTime),"
                    + "HasCoords")
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val builder = TraceDetailResponse.builder();
    builder.id(request.getTraceId());
    var totalTokens = 0;
    var completionTokens = 0;
    var promptTokens = 0;
    var latency = 0;
    val startTimes = new ArrayList<java.sql.Date>();
    val endTimes = new ArrayList<java.sql.Date>();
    while (mainTableResult.next()) {
      if (mainTableResult.getInt(0) == 1) {
        builder.resourceAttributes(mainTableResult.getString(1));
      }
      if (!mainTableResult.isNull(6)) {
        totalTokens += mainTableResult.getInt(6);
      }
      if (!mainTableResult.isNull(7)) {
        completionTokens += mainTableResult.getInt(7);
      }
      if (!mainTableResult.isNull(8)) {
        promptTokens += mainTableResult.getInt(8);
      }
      if (mainTableResult.isNull(9)
          || mainTableResult.getString(9).isEmpty()) { // Spans with empty ParentId
        if (!mainTableResult.isNull(10)) {
          latency += mainTableResult.getInt(10);
        }
      }
      if (!mainTableResult.isNull(3)) {
        startTimes.add(mainTableResult.getDate(3));
      }
      if (!mainTableResult.isNull(4)) {
        endTimes.add(mainTableResult.getDate(4));
      }
      if (!mainTableResult.isNull(5)) {
        val arr = mainTableResult.getJSONObject(5);
        if (arr.isArray()) {
          for (final JsonNode obj : arr) {
            builder.tag(obj.asText());
          }
        }
      }
      builder.entry(mainTableResult.getString(2));
    }
    val minStartTime = startTimes.stream().min(java.sql.Date::compareTo).orElse(null);
    val maxEndTime = endTimes.stream().max(java.sql.Date::compareTo).orElse(null);
    builder
        .startTime(minStartTime)
        .endTime(maxEndTime)
        .latency(latency)
        .totalTokens(totalTokens)
        .completionTokens(completionTokens)
        .promptTokens(promptTokens);
    return builder.build();
  }

  @SneakyThrows
  @Post(uri = "/list", consumes = MediaType.APPLICATION_JSON, produces = MediaType.APPLICATION_JSON)
  public TraceListResponse traceList(
      @Body TraceListRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {
    val clientRequestProperties = generateClientRequestProperties(identity);
    if (request.getInterval().getEndMillis() > DateTimeUtils.currentTimeMillis()) {
      clientRequestProperties.setOption("query_results_cache_force_refresh", "true");
    }

    // parameters
    val declaredParams = request.applyQueryParams(clientRequestProperties);
    val mainDeclarations = String.join(",", declaredParams);
    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val sortOrder = Optional.ofNullable(request.getAsc()).orElse(false) ? "asc" : "desc";
    val limit = Optional.ofNullable(request.getLimit()).orElse(100);
    val offset = Optional.ofNullable(request.getOffset()).orElse(0);

    var sortExpression = String.format("| order by StartTime %s", sortOrder);
    if (request.getSortCondition() != null) {
      switch (request.getSortCondition()) {
        case traceid:
          sortExpression = String.format("| order by TraceId %s", sortOrder);
          break;
        case latency:
          sortExpression = String.format("| order by Latency %s, TraceId asc", sortOrder);
          break;
        case tokens:
          sortExpression = String.format("| order by TotalTokens %s, TraceId asc", sortOrder);
          break;
        case applicationid:
          sortExpression = String.format("| order by ApplicationId %s, TraceId asc", sortOrder);
          break;
        case version:
          sortExpression = String.format("| order by Version %s, TraceId asc", sortOrder);
          break;
        case timestamp:
          sortExpression = String.format("| order by StartTime %s, TraceId asc", sortOrder);
          break;
        case issues:
          sortExpression = String.format("| order by PolicyIssues %s, TraceId asc", sortOrder);
          break;
      }
    }

    val queryBuild =
        ImmutableList.<String>builder() //
            .add(declareParamStatement)
            .add("TraceListViewV2")
            .addAll(request.buildWhereClauses())
            .add(TRACELISTVIEW_FIELD_PROJECTION)
            .addAll(request.buildFilterClauses())
            .add(sortExpression)
            .add("| extend PackedRecord = pack_all()")
            .add("| project RowId=row_number(), Entry=PackedRecord")
            .add("| where RowId > " + offset)
            .add("| limit " + limit)
            .build();

    String query = String.join("\n", queryBuild);
    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val builder = TraceListResponse.builder();
    var lastRecordRowId = 0;
    while (mainTableResult.next()) {
      builder.entry(mainTableResult.getString(1));
      lastRecordRowId = mainTableResult.getInt(0);
      log.info("packedRecord: {}", lastRecordRowId);
    }

    String totalQuery =
        String.join(
            "\n",
            ImmutableList.<String>builder() //
                .add(declareParamStatement)
                .add("TraceListViewV2")
                .addAll(request.buildWhereClauses())
                .add(TRACELISTVIEW_FIELD_PROJECTION)
                .addAll(request.buildFilterClauses())
                .add(
                    "| summarize Total=toint(dcount(TraceId)), TotalWithCoords=countif(HasCoords) by OrgId, ResourceId")
                .add("| project org=OrgId, ResourceId, Total, TotalWithCoords")
                .build());
    log.debug("Kusto total query: {}", totalQuery);
    KustoOperationResult totalCountResults =
        client.execute(databaseName, totalQuery, clientRequestProperties);
    KustoResultSetTable totalCountResult = totalCountResults.getPrimaryResults();
    var totalCount = 0;
    if (totalCountResult.next()) {
      totalCount = totalCountResult.getInt("Total");
      builder.total(totalCount);
      builder.totalWithCoords(totalCountResult.getInt("TotalWithCoords"));
    }
    if (totalCount > lastRecordRowId) {
      builder.nextOffset(lastRecordRowId);
      builder.partial(true);
    }

    return builder.build();
  }

  @SneakyThrows
  @Post(
      uri = "/query",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public TraceQueryResponse query(
      @Body TraceQueryRequest request,
      @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous") @Parameter(hidden = true)
          String identity) {
    log.debug("Trigger v3 analyzer PG");
    // Create a table named Events with 100 rows of data.
    val clientRequestProperties = generateClientRequestProperties(identity);

    // parameters
    val declaredParams = request.applyQueryParams(clientRequestProperties);
    val mainDeclarations = String.join(",", declaredParams);
    val declareParamStatement = "declare query_parameters(" + mainDeclarations + ");";

    val sortOrder = Optional.ofNullable(request.getAsc()).orElse(false) ? "asc" : "desc";
    val limit = Optional.ofNullable(request.getLimit()).orElse(500);
    val offset = Optional.ofNullable(request.getOffset()).orElse(0);

    val queryBuild =
        ImmutableList.<String>builder() //
            .add(declareParamStatement)
            .add("traces")
            .addAll(request.buildWhereClauses())
            .add(String.format("| order by StartTime %s, TraceId, SpanId", sortOrder))
            .add(TRACES_DETAILS_EXTENDED_ATTRIBUTES)
            .add("| project RowId=row_number(), Entry=PackedRecord")
            .add("| where RowId > " + offset)
            .add("| limit " + limit)
            .build();

    String query = String.join("\n", queryBuild);

    log.debug("Kusto query: {}", query);
    KustoOperationResult results = client.execute(databaseName, query, clientRequestProperties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val builder = TraceQueryResponse.builder();
    var lastRecordRowId = 0;
    while (mainTableResult.next()) {
      builder.entry(mainTableResult.getString(1));
      lastRecordRowId = mainTableResult.getInt(0);
      log.info("packedRecord: {}", lastRecordRowId);
    }

    String totalQuery =
        String.join(
            "\n",
            ImmutableList.<String>builder() //
                .add(declareParamStatement)
                .add("traces")
                .addAll(request.buildWhereClauses())
                .add("| summarize Total=toint(count(TraceId)) by OrgId, ResourceId")
                .add("| project org=OrgId, ResourceId, Total")
                .build());
    KustoOperationResult totalCountResults =
        client.execute(databaseName, totalQuery, clientRequestProperties);
    KustoResultSetTable totalCountResult = totalCountResults.getPrimaryResults();
    var totalCount = 0;
    if (totalCountResult.next()) {
      totalCount = totalCountResult.getInt(2);
      builder.total(totalCount);
    }
    if (totalCount > lastRecordRowId) {
      builder.nextOffset(lastRecordRowId);
      builder.partial(true);
    }

    return builder.build();
  }
}
