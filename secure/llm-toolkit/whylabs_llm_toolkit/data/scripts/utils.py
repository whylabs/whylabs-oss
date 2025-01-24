import os
from pathlib import Path


def generate_index_html(root_folder: str):
    # Get all HTML files in the root folder and subfolders
    html_files = list(Path(root_folder).rglob("*.html"))

    # Create the content for the index.html file
    content = """
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Index of HTML Files</title>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
          h1 { color: #333; }
          ul { list-style-type: none; padding: 0; }
          li { margin-bottom: 10px; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
      </style>
  </head>
  <body>
      <h1>Index of HTML Files</h1>
      <ul>
  """

    # Add links to each HTML file
    for file in html_files:
        relative_path = os.path.relpath(file, root_folder)
        content += f'        <li><a href="{relative_path}">{relative_path}</a></li>\n'

    content += """
      </ul>
  </body>
  </html>
  """

    # Write the index.html file
    with open(os.path.join(root_folder, "index.html"), "w") as f:
        f.write(content)
