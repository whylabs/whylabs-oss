#!/bin/bash

# Directory to search for source code files
DIRECTORY="./projects"

# Find and replace with respective placeholders
find "$DIRECTORY" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) | while read -r file; do
    sed -i '' 's/highcharts/hcplaceholder/g' "$file"
    sed -i '' 's/Highcharts/HCPlaceholder/g' "$file"
done
