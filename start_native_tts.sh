#!/bin/bash
# MealPulse AI — Native Apple Silicon XTTS-v2 Speech Server
# Direct Metal (MPS) & Unified Memory Acceleration

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export COQUI_TOS_AGREED=1
export PYTORCH_ENABLE_MPS_FALLBACK=1
export VOICES_DIR="$DIR/assets/voices"
export TTS_DEVICE=mps

echo "🚀 Starting MealPulse Native XTTS Speech Server on Apple Silicon (MPS)..."
exec "$DIR/tts_env/bin/python" -m uvicorn main:app --host 0.0.0.0 --port 8000
