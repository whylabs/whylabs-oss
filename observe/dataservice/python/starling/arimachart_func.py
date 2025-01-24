from __future__ import unicode_literals

import io
from dataclasses import asdict
from datetime import datetime
from typing import List

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import pandas as pd
from smart_open import open

from starling.monitorclasses import ChartOutput, CalculationResult

# uses the Anti-Grain Geometry C++ library to make a raster (pixel) image of the figure
# otherwise plot with throw NSInternalInconsistencyException
plt.switch_backend('Agg')

class ArimaChartFunction:
  def compute(self,
              data: List[dict],
              path: str,
              columnName: str,
              segmentText: str, # not used
              metric: str) -> ChartOutput:
      data = [(k, CalculationResult.from_dict(v)) for pair in data for k, v in
              pair.items()]
      df = pd.json_normalize([asdict(v) for (k, v) in data])
      df['timestamp'] = [datetime.fromtimestamp(int(k)/1000) for (k,_) in data]
      df = df.drop_duplicates(subset=['timestamp'])
      df.set_index('timestamp', inplace=True)

      ribboncolor=tuple(e / 256 for e in (189,223,228))
      linecolor=tuple(e / 256 for e in (65,138,151))
      alertcolor=tuple(e / 256 for e in (256,0,0))
      gridcolor = tuple(e / 256 for e in (220,229,231))
      tickcolor = tuple(e / 256 for e in (96,105,107))


      fig = plt.figure(figsize=(11,2.5), tight_layout=True)
      ax = plt.subplot()
      ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
      ax.xaxis.set_major_locator(mdates.AutoDateLocator(interval_multiples=False))

      mkfunc = lambda x, pos: '%1.0fm' % (x * 1e-6) if x >= 1e6 else '%1.0fk' % (x * 1e-3) if x >= 1e3 else '%1.1f' % x
      mkformatter = ticker.FuncFormatter(mkfunc)
      ax.yaxis.set_major_formatter(mkformatter)

      ax.xaxis.label.set_color(tickcolor)
      ax.tick_params(axis='x', colors=tickcolor, labelsize=10)
      ax.tick_params(axis='y', colors=tickcolor, labelsize=10)
      ax.grid(color=gridcolor)
      plt.ylabel(f"{columnName} – {metric}\nseasonal forecast", rotation=90)

      plt.plot(df.value, marker='o', markersize=3, lw=1.5,
               color=linecolor, label=f"{metric}")
      if any(df.alertCount > 0):
          plt.plot(df[df.alertCount > 0].value, marker='o', markersize=3, lw=0,
                   color=alertcolor, label="_hidden")
      ax.fill_between(df.index, df['lowerThreshold'], df['upperThreshold'], facecolor=ribboncolor)
      ax.set_xlabel(None)
      plt.legend()
      # textstr = ""
      # if segmentText is not None and segmentText != '':
      #   textstr = f'segment: {segmentText}'
      # plt.figtext(0.12, .9, textstr, fontsize=10)
      # plt.text(0.12, .9, textstr, fontsize=12, transform=plt.gcf().transFigure)

      img_data = io.BytesIO()
      plt.savefig(img_data, format='png')
      img_data.seek(0)
      print(path)
      with open(path, 'wb') as f:
          f.write(img_data.getbuffer())
      return ChartOutput(success=True, message="no reason")
