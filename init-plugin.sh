#!/bin/bash
set -euo pipefail

# init-plugin.sh
# Initializes a new Obsidian plugin from this template by updating IDs, names, classes, and configs.

echo "========================================================"
echo " Obsidian Plugin Initializer"
echo "========================================================"

read -r -p "Plugin ID (kebab-case, e.g. my-awesome-plugin): " PLUGIN_ID
read -r -p "Plugin Name (Human readable, e.g. My Awesome Plugin): " PLUGIN_NAME
read -r -p "Plugin Description: " PLUGIN_DESC
read -r -p "Author Name / GitHub Username: " PLUGIN_AUTHOR

if [ -z "$PLUGIN_ID" ] || [ -z "$PLUGIN_NAME" ]; then
  echo "Error: Plugin ID and Plugin Name cannot be empty."
  exit 1
fi

# Generate PascalCase class name (e.g. "My Awesome Plugin" -> "MyAwesomePlugin")
RAW_PASCAL=$(echo "$PLUGIN_NAME" | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1' | sed 's/[^a-zA-Z0-9]//g')
if [[ "$RAW_PASCAL" != *Plugin ]]; then
  PLUGIN_CLASS="${RAW_PASCAL}Plugin"
else
  PLUGIN_CLASS="$RAW_PASCAL"
fi

SETTINGS_INTERFACE="${PLUGIN_CLASS}Settings"
DOCKER_NAME=$(echo "$PLUGIN_ID" | tr '_' '-')

echo ""
echo "Configuring plugin: $PLUGIN_NAME ($PLUGIN_ID)..."
echo "Class name: $PLUGIN_CLASS"
echo "Settings interface: $SETTINGS_INTERFACE"
echo "Docker service: $DOCKER_NAME"
echo ""

# 1. Update manifest.json
if [ -f "manifest.json" ]; then
  sed -i.bak -E \
    -e "s/\"id\": \"[^\"]*\"/\"id\": \"$PLUGIN_ID\"/" \
    -e "s/\"name\": \"[^\"]*\"/\"name\": \"$PLUGIN_NAME\"/" \
    -e "s/\"description\": \"[^\"]*\"/\"description\": \"$PLUGIN_DESC\"/" \
    -e "s/\"author\": \"[^\"]*\"/\"author\": \"$PLUGIN_AUTHOR\"/" \
    manifest.json
  rm -f manifest.json.bak
fi

# 2. Update package.json
if [ -f "package.json" ]; then
  sed -i.bak -E \
    -e "s/\"name\": \"[^\"]*\"/\"name\": \"$PLUGIN_ID\"/" \
    -e "s/\"description\": \"[^\"]*\"/\"description\": \"$PLUGIN_DESC\"/" \
    -e "s/\"author\": \"[^\"]*\"/\"author\": \"$PLUGIN_AUTHOR\"/" \
    package.json
  rm -f package.json.bak
fi

# 3. Update docker-compose.yml service name
if [ -f "docker-compose.yml" ]; then
  sed -i.bak -E \
    -e "s/obsidian-plugin-template:/$DOCKER_NAME: \&$DOCKER_NAME/" \
    docker-compose.yml
  rm -f docker-compose.yml.bak
fi

# 4. Update src/main.ts and src/settings.ts
if [ -f "src/main.ts" ]; then
  sed -i.bak -E \
    -e "s/MyPluginSettings/$SETTINGS_INTERFACE/g" \
    -e "s/MyPlugin/$PLUGIN_CLASS/g" \
    src/main.ts
  rm -f src/main.ts.bak
fi

if [ -f "src/settings.ts" ]; then
  sed -i.bak -E \
    -e "s/MyPluginSettings/$SETTINGS_INTERFACE/g" \
    -e "s/MyPlugin/$PLUGIN_CLASS/g" \
    src/settings.ts
  rm -f src/settings.ts.bak
fi

# 5. Update tests/main.test.ts
if [ -f "tests/main.test.ts" ]; then
  sed -i.bak -E \
    -e "s/MyPlugin/$PLUGIN_CLASS/g" \
    -e "s/\"obsidian-plugin-template\"/\"$PLUGIN_ID\"/g" \
    -e "s/\"Template Plugin\"/\"$PLUGIN_NAME\"/g" \
    tests/main.test.ts
  rm -f tests/main.test.ts.bak
fi

# 6. Update README.md
if [ -f "README.md" ]; then
  sed -i.bak -E \
    -e "s/obsidian-plugin-template/$DOCKER_NAME/g" \
    README.md
  rm -f README.md.bak
fi

echo "Configuration completed successfully!"
echo "Next steps:"
echo "1. Verify manifest.json, package.json, and docker-compose.yml"
echo "2. Run 'docker compose run --rm $DOCKER_NAME npm run build' to test the build"
