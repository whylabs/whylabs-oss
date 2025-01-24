# register all the detectors
from smart_config.server.diagnosis.detectors.few_unique import FewUnique
from smart_config.server.diagnosis.detectors.late_upload import LateUpload
from smart_config.server.diagnosis.detectors.many_unique import ManyUnique
from smart_config.server.diagnosis.detectors.narrow_threshold_band import NarrowThresholdBand
from smart_config.server.diagnosis.detectors.small_nonnull_batches import SmallNonNullBatches
from smart_config.server.diagnosis.detectors.changing_discrete import ChangingDiscrete
from smart_config.server.diagnosis.registry.detector_registry import DetectorRegistry
from smart_config.server.diagnosis.detectors.fixed_threshold import FixedThreshold
from smart_config.server.diagnosis.detectors.fixed_baseline import FixedBaseline
from smart_config.server.diagnosis.detectors.missing_baseline_batches import MissingBaselineBatches
from smart_config.server.diagnosis.detectors.stddev_insufficient_baseline import StddevInsufficientBaseline
from smart_config.server.diagnosis.detectors.stale_results import StaleResults
from smart_config.server.diagnosis.detectors.changing_continuous import ChangingContinuous
from smart_config.server.diagnosis.detectors.low_drift_threshold import LowDriftThreshold
from smart_config.server.diagnosis.detectors.very_few_unique import VeryFewUnique

DetectorRegistry.register(StaleResults())
DetectorRegistry.register(ChangingDiscrete())
DetectorRegistry.register(ChangingContinuous())
DetectorRegistry.register(FixedThreshold())
DetectorRegistry.register(FixedBaseline())
DetectorRegistry.register(LowDriftThreshold())
DetectorRegistry.register(MissingBaselineBatches())
DetectorRegistry.register(StddevInsufficientBaseline())
DetectorRegistry.register(LateUpload())
DetectorRegistry.register(FewUnique())
DetectorRegistry.register(ManyUnique())
DetectorRegistry.register(SmallNonNullBatches())
DetectorRegistry.register(NarrowThresholdBand())
DetectorRegistry.register(VeryFewUnique())
