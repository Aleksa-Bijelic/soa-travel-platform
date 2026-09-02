#!/bin/bash
set -e

FLAG="/data/initialized.flag"
CYPHER_DIR="/docker-entrypoint-initdb.d"

NEO4J_USER=$(echo "$NEO4J_AUTH" | cut -d'/' -f1)
NEO4J_PASS=$(echo "$NEO4J_AUTH" | cut -d'/' -f2)

if [ -f "$FLAG" ]; then
  echo "Neo4j already initialized, skipping seed."
  exit 0
fi

echo "Waiting for Neo4j to be ready..."
until cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASS" "RETURN 1" &>/dev/null; do
  sleep 2
done

echo "Running seed scripts..."
for f in "$CYPHER_DIR"/*.cypher; do
  echo "  -> $f"
  cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASS" -f "$f"
done

touch "$FLAG"
echo "Seeding complete."
