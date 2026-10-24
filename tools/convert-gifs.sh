#!/usr/bin/env bash
# Convertit les GIF lourds de src/static/assets/img en MP4 (H.264, lisible partout).
# Le GIF d'origine est déplacé dans src/originals/ (gardé dans le repo mais pas publié).
# Le build remplace ensuite automatiquement <img src="….gif"> par une <video>.
#
#   bash tools/convert-gifs.sh          # GIF de plus de 300 Ko
#   MIN_KB=0 bash tools/convert-gifs.sh # tous les GIF
set -euo pipefail
cd "$(dirname "$0")/.."

IMG=src/static/assets/img
ORIG=src/originals
MIN_KB=${MIN_KB:-300}
mkdir -p "$ORIG"

before=0; after=0
for gif in "$IMG"/*.gif; do
  [ -e "$gif" ] || continue
  kb=$(( $(stat -f%z "$gif") / 1024 ))
  [ "$kb" -ge "$MIN_KB" ] || continue
  mp4="${gif%.gif}.mp4"
  ffmpeg -loglevel error -y -i "$gif" \
    -movflags +faststart -pix_fmt yuv420p -an \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:v libx264 -preset slow -crf 23 "$mp4"
  out=$(( $(stat -f%z "$mp4") / 1024 ))
  before=$((before + kb)); after=$((after + out))
  printf '%-40s %6d Ko -> %5d Ko\n' "$(basename "$gif")" "$kb" "$out"
  mv "$gif" "$ORIG/"
done
echo "Total : $((before / 1024)) Mo -> $((after / 1024)) Mo"
