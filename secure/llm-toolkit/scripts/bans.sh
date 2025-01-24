#!/bin/bash

# Directories to search
directories=("whylabs_llm_toolkit" "langkit")

# Patterns to search for
patterns=('# type: ignore' 'print(')

# Directories to ignore
ignored_dirs=("whylabs_llm_toolkit/data/scripts" "whylabs_llm_toolkit/data/datasets")

# Function to search for patterns in a given directory
search_patterns() {
  local dir=$1
  local pattern=$2
  local find_cmd="find $dir -type f -name '*.py'"

  # Append exclusion rules for each ignored directory
  for ignore in "${ignored_dirs[@]}"; do
    find_cmd+=" ! -path '$ignore/*'"
  done

  # Use find to locate files and grep to search within them
  eval "$find_cmd" | xargs grep -l "$pattern"
}

# Flag to indicate if any matches were found
found_any=false

# Loop through directories and patterns
for dir in "${directories[@]}"; do
  for pattern in "${patterns[@]}"; do
    found_files=$(search_patterns "$dir" "$pattern")
    if [ -n "$found_files" ]; then
      echo "Files in $dir with pattern '$pattern':"
      echo "$found_files"
      found_any=true
    fi
  done
done

# Exit with an appropriate status
if [ "$found_any" = true ]; then
  exit 1
else
  echo "No specified patterns found."
  exit 0
fi

