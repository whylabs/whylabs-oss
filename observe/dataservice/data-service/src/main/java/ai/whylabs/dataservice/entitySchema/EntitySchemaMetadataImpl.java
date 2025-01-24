package ai.whylabs.dataservice.entitySchema;

import static ai.whylabs.core.utils.Constants.SCHEMA_METADATA_PATH;
import static ai.whylabs.ingestion.S3ClientFactory.getS3Client;

import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.druid.whylogs.streaming.S3ObjectWrapper;
import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.PutObjectResult;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import software.amazon.awssdk.core.exception.SdkClientException;

@RequiredArgsConstructor
@Slf4j
public class EntitySchemaMetadataImpl implements EntitySchemaMetadata {
  // read default metrics metadata from resources
  private static final Gson GSON = new Gson();
  static final String DEFAULT_SCHEMA_METADATA_JSON;
  public String overridePath = SCHEMA_METADATA_PATH;

  static {
    try {
      DEFAULT_SCHEMA_METADATA_JSON =
          IOUtils.resourceToString("/default-schema-metadata.json", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  static final Type mapType = new TypeToken<DefaultSchemaMetadata>() {}.getType();
  static final DefaultSchemaMetadata defaultSchemaMetadata =
      GSON.fromJson(DEFAULT_SCHEMA_METADATA_JSON, mapType);

  public DefaultSchemaMetadata getDefaultSchemaMetadata() {
    return defaultSchemaMetadata;
  }

  private final DataSvcConfig config;

  public DefaultSchemaMetadata getOverrideDefaultSchemaMetadata() {
    if (!config.isDeployed()) {
      log.info("Not deployed - skip reading default schema metadata from S3.");
      return null;
    }

    try {
      S3ObjectWrapper s3ObjectWrapper =
          new S3ObjectWrapper(
              getS3Client()
                  .getObject(new GetObjectRequest(config.getSongbirdBucket(), overridePath)));
      Reader reader =
          new InputStreamReader(s3ObjectWrapper.getContentStream(), StandardCharsets.UTF_8);
      return GSON.fromJson(reader, mapType);
    } catch (AmazonS3Exception e) {
      if (e.getStatusCode() == 404) {
        // no override, which is good
        return null;
      } else {
        throw e;
      }
    } catch (SdkClientException e) {
      // likely failed to load credentials - happens during unit tests
      log.error(e.getMessage());
      return null;

    } catch (ClassCastException e) {
      // likely failed to load credentials
      log.error(e.getMessage());
      return null;
    }
  }

  public void resetOverrideDefaultSchemaMetadata() {
    try {
      getS3Client().deleteObject(config.getSongbirdBucket(), overridePath);
    } catch (AmazonS3Exception e) {
      if (e.getStatusCode() != 404) {
        throw e;
      }
    }
  }

  public String writeOverrideDefaultSchemaMetadata(DefaultSchemaMetadata overrideMetadata) {
    PutObjectResult result =
        getS3Client()
            .putObject(config.getSongbirdBucket(), overridePath, GSON.toJson(overrideMetadata));
    return result.getETag();
  }
}
