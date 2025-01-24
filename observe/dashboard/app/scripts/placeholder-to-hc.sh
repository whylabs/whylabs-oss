#!/bin/bash

# Directory to search for source code files
DIRECTORY="./client"

# Find and replace with respective placeholders
find "$DIRECTORY" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) | while read -r file; do
    sed -i '' 's/hcplaceholder/highcharts/g' "$file"
    sed -i '' 's/HCPlaceholder/Highcharts/g' "$file"
done
