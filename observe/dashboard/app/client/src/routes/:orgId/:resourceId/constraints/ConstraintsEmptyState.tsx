import { EmptyPageContent } from '~/components/empty-state/EmptyPageContent';
import React from 'react';

const code = `### Be sure to install whylabs toolkit
### pip install whylabs_toolkit

from whylabs_toolkit.monitor.models import *
from whylabs_toolkit.monitor import MonitorSetup
from whylabs_toolkit.monitor import MonitorManager

### Example of a max value constraint
monitor_setup = MonitorSetup(monitor_id="image-Brightness-stddev-max-constraint")
manager = MonitorManager(setup=monitor_setup)
monitor_setup.config = FixedThresholdsConfig (
    metric=SimpleColumnMetric.max,
    upper=37
)
monitor_setup.set_target_columns(columns=["image.Brightness.stddev"])
monitor_setup.is_constraint = True
monitor_setup.disable_target_rollup = True # Can only be enabled if individual profile granularity is supported by your organization
monitor_setup.apply()
manager.save()
`;

export const ConstraintsEmptyState = (): React.ReactElement => {
  return (
    <EmptyPageContent
      maxContentWidth={900}
      code={code}
      language="python"
      title="This resource has no constraints"
      subtitle={
        <p>Here&apos;s how to create a constraint with the WhyLabs Toolkit:</p>
        // <p> TODO: #86aybqwdh -- update when we have published constraints documentation to code below
        //   Instructions and examples on how to create constraints can be found in{' '}
        //   <ExternalLink to="constraintsDocumentation" id="constraints-documentation--empty-state-link">
        //     Whylabs documentation
        //   </ExternalLink>
        //   .
        // </p>
      }
    />
  );
};
