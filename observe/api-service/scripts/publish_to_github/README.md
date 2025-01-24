# Publishing code to Github
This directory contains scripts to publish the existing code to our open repository on Github.
It assumes that you are running on an environment that has SSH key pairs with the Github, and that your
account is privileged with read and write accesses.

## Running the script
```bash
/bin/sh ./publish_to_github/publish_to_github.sh
```

It will:
1. Copy the relevant files to a temporary `gitlab_files` directory
2. Clone the repository from github
3. Delete the existing modifiable files on the Github's repo
4. Setup a branch called `release-{version}` and add a temporary remote
5. Add, commit and push the files to Github
6. Clean up the remote and created files

After running this script, all you have to do is open a PR on Github from the created `release-{version}`
