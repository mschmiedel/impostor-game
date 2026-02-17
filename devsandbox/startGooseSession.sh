#!/bin/bash

# Default-Modell (Fallback), falls kein Parameter übergeben wird
MODEL=${1:-local-qwen}

echo "Starte Goose mit Modell: $MODEL"

# Wir setzen GOOSE_MODEL direkt für diesen Befehl im Container
podman compose exec -it -e GOOSE_MODEL="$MODEL" goose-impostor goose session