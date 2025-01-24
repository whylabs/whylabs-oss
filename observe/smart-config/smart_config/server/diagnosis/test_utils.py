from whylabs_toolkit.monitor.models import SegmentTag

from whylabs_toolkit.monitor.diagnoser.helpers.utils import text_to_segment


def test_text_to_segment():
    assert text_to_segment('k1=ab&k2=1') == [SegmentTag(key='k1', value='ab'), SegmentTag(key='k2', value='1')]
