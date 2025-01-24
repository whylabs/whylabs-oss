package ai.whylabs.core.aws;

import ai.whylabs.core.utils.ConfigAwsSdk;
import com.amazonaws.auth.AWSCredentials;
import com.amazonaws.auth.AWSCredentialsProvider;
import com.amazonaws.auth.BasicSessionCredentials;
import com.google.common.collect.ImmutableMap;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.profiles.Profile;
import software.amazon.awssdk.services.sso.auth.SsoProfileCredentialsProviderFactory;

@Slf4j
public class WhyLabsCredentialsProviderChain
    implements AwsCredentialsProvider, AWSCredentialsProvider {
  private static WhyLabsCredentialsProviderChain INSTANCE;
  private static final String DEV_ACCOUNT_ID = "222222222222"; // prod is 003872937983

  private final AwsCredentialsProviderChain providerChain;

  public static WhyLabsCredentialsProviderChain getInstance() {
    if (INSTANCE == null) {
      ConfigAwsSdk.defaults();
      INSTANCE = new WhyLabsCredentialsProviderChain();
    }
    return INSTANCE;
  }

  private WhyLabsCredentialsProviderChain() {
    val props = createProps();
    // SSO credentials are only available in local mode (local developers). This is ignored in other
    // environments
    val profile = Profile.builder().name("whylabs").properties(props).build();
    val ctx = ProfileProviderCredentialsContext.builder().profile(profile).build();
    val builder = AwsCredentialsProviderChain.builder();
    try {
      builder.addCredentialsProvider(new SsoProfileCredentialsProviderFactory().create(ctx));
    } catch (Exception e) {
      log.warn("Failed to create SSO credentials. Error: {}", e.getMessage());
    }

    this.providerChain =
        builder
            .addCredentialsProvider(InstanceProfileCredentialsProvider.create()) // ec2
            .addCredentialsProvider(EnvironmentVariableCredentialsProvider.create()) // environment
            .addCredentialsProvider(WebIdentityTokenFileCredentialsProvider.create()) // eks
            .reuseLastProviderEnabled(true)
            .build();
  }

  @Override
  public AwsCredentials resolveCredentials() {
    return this.providerChain.resolveCredentials();
  }

  @Override
  public AWSCredentials getCredentials() {
    val cred = (AwsSessionCredentials) this.resolveCredentials();
    return new BasicSessionCredentials(
        cred.accessKeyId(), cred.secretAccessKey(), cred.sessionToken());
  }

  @Override
  public void refresh() {}

  private static ImmutableMap<String, String> createProps() {
    val accountId = System.getenv().getOrDefault("AWS_ACCOUNT_ID", DEV_ACCOUNT_ID);
    log.info("Using AWS account ID: {}", accountId);
    return ImmutableMap.<String, String>builder()
        .put("region", "us-west-2")
        .put("sso_region", "us-west-2")
        .put("sso_start_url", "https://whylabs.awsapps.com/start#/")
        .put("sso_account_id", accountId) // development account
        .put("sso_role_name", "DeveloperFullAccess")
        .build();
  }
}
