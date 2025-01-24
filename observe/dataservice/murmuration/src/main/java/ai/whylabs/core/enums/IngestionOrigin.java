package ai.whylabs.core.enums;

public enum IngestionOrigin {
  WhylogDeltalakeWriterJob,
  @Deprecated
  WhylogDeltalakeWriterJobMerge, // We now retain the Origin when merging
  ExternalS3ToDeltalakeJob,
  ProfileCopyJob,
  DemoData
}
