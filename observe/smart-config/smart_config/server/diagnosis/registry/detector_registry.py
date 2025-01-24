from typing import List, Dict

from whylabs_toolkit.monitor.models import Analyzer

from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector


class DetectorRegistry:
    detectors: Dict[str, ConditionDetector] = {}

    @classmethod
    def register(cls, detector: ConditionDetector):
        # check for conflicts
        if detector.condition in cls.detectors and detector != cls.detectors[detector.condition]:
            raise ValueError(f'A detector is already registered for {detector.condition}')
        cls.detectors[detector.condition] = detector

    @classmethod
    def get_detectors_for_analyzer(cls, analyzer: Analyzer) -> List[ConditionDetector]:
        return [detector for detector in cls.detectors.values() if detector.matches_analyzer(analyzer)]
