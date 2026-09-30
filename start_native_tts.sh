#!/bin/bash
# MealPulse AI — Apple Silicon MLX voice cloning, with legacy XTTS voices
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export COQUI_TOS_AGREED=1
export PYTORCH_ENABLE_MPS_FALLBACK=1
export VOICES_DIR="$DIR/assets/voices"
export TTS_DEVICE=mps
export TTS_ENGINE="${TTS_ENGINE:-mlx}"
export TTS_DIALECT_REWRITE="${TTS_DIALECT_REWRITE:-1}"
export TTS_LEGACY_PYTHON="${TTS_LEGACY_PYTHON:-$DIR/tts_env/bin/python}"

if [[ "$TTS_ENGINE" == "mlx" ]]; then
  TTS_PYTHON="$DIR/venv_mlx_tts/bin/python"
else
  TTS_PYTHON="$DIR/tts_env/bin/python"
fi
if [[ ! -x "$TTS_PYTHON" ]]; then
  echo "Ambiente TTS mancante: segui docs/LOCAL_TTS.md per installarlo." >&2
  exit 1
fi
echo "Avvio MealPulse TTS ($TTS_ENGINE) sulla porta ${PORT:-8000}..."
exec "$TTS_PYTHON" -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
