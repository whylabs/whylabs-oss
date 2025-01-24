from __future__ import unicode_literals

import io
from dataclasses import asdict
from datetime import datetime
from typing import List

import matplotlib.ticker as ticker
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd
from smart_open import open

from starling.monitorclasses import ChartOutput, DriftCalculationResult

# uses the Anti-Grain Geometry C++ library to make a raster (pixel) image of the figure
# otherwise plot with throw NSInternalInconsistencyException
plt.switch_backend('Agg')

class DriftChartFunction:
  def compute(self,
              data: List[dict],
              path: str,
              columnName: str,
              segmentText:str, # not used
              metric: str) -> ChartOutput:

    data = [(k, DriftCalculationResult.from_dict(v)) for pair in data for k, v in
          pair.items()]
    df = pd.json_normalize([asdict(v) for (k, v) in data])

    df['timestamp'] = [datetime.fromtimestamp(int(k) / 1000) for (k, _) in data]
    df = df.drop_duplicates(subset=['timestamp'])
    df.set_index('timestamp', inplace=True)

    linecolor = tuple(e / 256 for e in (65, 138, 151))
    alertcolor = tuple([1,0,0,0.75])
    gridcolor = tuple(e / 256 for e in (220,229,231))
    tickcolor = tuple(e / 256 for e in (96,105,107))

    fig = plt.figure(figsize=(11,3), tight_layout=True)
    ax = plt.subplot()
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator(interval_multiples=False))

    mkfunc = lambda x, pos: '%1.1fM' % (x * 1e-6) if x >= 1e6 else '%1.1fK' % (x * 1e-3) if x >= 1e3 else '%1.1f' % x
    mkformatter = ticker.FuncFormatter(mkfunc)
    ax.yaxis.set_major_formatter(mkformatter)

    ax.xaxis.label.set_color(tickcolor)
    ax.tick_params(axis='x', colors=tickcolor)
    ax.tick_params(axis='y', colors=tickcolor)
    ax.grid(color=gridcolor)
    plt.ylabel(f"{columnName} – {metric}\ndistribution distance", rotation=90)
    plt.plot(df.metricValue, marker='o', markersize=3, lw=1.5,
             color=linecolor, label=f"distance")

    if any(df.alertCount > 0):
      plt.plot(df[df.alertCount > 0].metricValue, marker='o', markersize=3, lw=0,
                                     color=alertcolor, label="_hidden")

    # NB potential graphical bug; only plotting the most recent threshold.
    # should plot per-event threshold b/c it might change over time.
    plt.axhline(y = df.threshold[-1], color=alertcolor, lw=0.5, linestyle = 'dashed', label="threshold")
    plt.legend()

    img_data = io.BytesIO()
    plt.savefig(img_data, format='png')
    img_data.seek(0)
    with open(path, 'wb') as f:
        f.write(img_data.getbuffer())
    print(path)
    return ChartOutput(True, "")
