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

from .monitorclasses import ChartOutput, CalculationResult

# uses the Anti-Grain Geometry C++ library to make a raster (pixel) image of the figure
# otherwise plot with throw NSInternalInconsistencyException
plt.switch_backend('Agg')


class StddevChartFunction:
    #   List<Pair<Long, CalculationResult>> data;
    #    String path;  // S3 output path
    def compute(self,
                data: List[dict],
                path: str,
                columnName: str,
                segmentText: str,  # not used
                metric: str) -> ChartOutput:

        data = [(k, CalculationResult.from_dict(v)) for pair in data for k, v in pair.items()]
        df = pd.json_normalize([asdict(v) for (k, v) in data])
        df['timestamp'] = [datetime.fromtimestamp(int(k) / 1000) for (k, _) in data]
        df = df.drop_duplicates(subset=['timestamp'])
        df.set_index('timestamp', inplace=True)

        ribboncolor = tuple(e / 256 for e in (189, 223, 228))
        linecolor = tuple(e / 256 for e in (65, 138, 151))
        alertcolor = tuple(e / 256 for e in (256, 0, 0))
        gridcolor = tuple(e / 256 for e in (220, 229, 231))
        tickcolor = tuple(e / 256 for e in (96, 105, 107))

        fig = plt.figure(figsize=(11, 3), tight_layout=True)
        ax = plt.subplot()
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator(interval_multiples=False))

        mkfunc = lambda x, pos: '%1.2fm' % (x * 1e-6) if x >= 1e6 else '%1.2fk' % (
                    x * 1e-3) if x >= 1e3 else '%1.1f' % x
        mkformatter = ticker.FuncFormatter(mkfunc)
        ax.yaxis.set_major_formatter(mkformatter)

        ax.xaxis.label.set_color(tickcolor)
        ax.tick_params(axis='x', colors=tickcolor)
        ax.grid(color=gridcolor)
        plt.plot(df.value, marker='o', markersize=3, lw=1.5,
                color=linecolor, label=f"{metric}")
        if any(df.alertCount > 0):
            plt.plot(df[df.alertCount > 0].value, marker='o', markersize=3, lw=0,
                    color=alertcolor, label="_hidden")
        ax.fill_between(df.index, df['lowerThreshold'], df['upperThreshold'], facecolor=ribboncolor)

        # add padding to chart depending on the range of y-values. The hope is
        # to make the notification charts look more like dashboard charts. Add
        # 20% margin for large range, with a minimum range of 70 units.
        # See CU-2rd1uaw
        ymin, ymax = ax.get_ylim()
        # note y-axis limit may be set with set_ylim() or margins(), but not both.
        if abs(ymax - ymin) < 70:
            m = ymin + abs(ymax - ymin) / 2.0
            ax.set_ylim(m - 35, m + 35)  # set y-axis explicitly
        else:
            ax.set_ymargin(.50)  # pad y-axis by 50%
        ax.set_xmargin(0.01)  # slightly expand x-axis

        plt.ylabel(f"{columnName} – {metric}\nstandard deviation", rotation=90)

        ax.set_xlabel(None)
        ax.grid(color=gridcolor)
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator(interval_multiples=False))
        ax.xaxis.label.set_color(tickcolor)
        ax.tick_params(axis='x', colors=tickcolor)
        plt.legend()

        img_data = io.BytesIO()
        plt.savefig(img_data, format='png')
        img_data.seek(0)
        with open(path, 'wb') as f:
            f.write(img_data.getbuffer())
        return ChartOutput(True, "no reason")
