#!/usr/bin/env bash
# Allège les GIF lourds de src/static/assets/img (ffmpeg et webp requis : brew install ffmpeg webp).
#
# Pour chaque GIF :
#   - un WebP animé (gif2webp) s'il fait moins de MAX_WEBP_KB : c'est une image, il s'anime
#     partout comme un GIF, même quand le navigateur bloque la lecture automatique des vidéos ;
#   - sinon un MP4 (H.264), beaucoup plus léger pour les visuels filmés ou très granuleux.
# Le GIF d'origine est déplacé dans src/originals/ (gardé dans le repo mais pas publié).
# Le build remplace ensuite automatiquement les « ….gif » par le .webp ou le .mp4.
#
#   bash tools/convert-gifs.sh          # GIF de plus de 300 Ko
#   MIN_KB=0 bash tools/convert-gifs.sh # tous les GIF
set -euo pipefail
cd "$(dirname "$0")/.."

IMG=src/static/assets/img
ORIG=src/originals
MIN_KB=${MIN_KB:-300}
MAX_WEBP_KB=${MAX_WEBP_KB:-2048}
MAX_W=${MAX_W:-1200}
mkdir -p "$ORIG"
size_kb() { echo $(( $(stat -f%z "$1") / 1024 )); }

# Les GIF déjà déplacés dans src/originals sont reconvertis aussi (changement de réglages)
for gif in "$IMG"/*.gif "$ORIG"/*.gif; do
  [ -e "$gif" ] || continue
  id=$(basename "$gif" .gif)
  kb=$(size_kb "$gif")
  [ "$kb" -ge "$MIN_KB" ] || continue
  rm -f "$IMG/$id.webp" "$IMG/$id.mp4"

  # Réduit à MAX_W px de large avant le WebP : un grand WebP animé se décode lentement
  # (surtout dans Safari) et l'animation paraît ralentie
  small="$(mktemp -t gif).gif"
  ffmpeg -loglevel error -y -i "$gif" \
    -vf "scale='min($MAX_W,iw)':-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a" \
    "$small"
  gif2webp -quiet -lossy -q 70 -m 4 -mt "$small" -o "$IMG/$id.webp"
  rm -f "$small"
  if [ "$(size_kb "$IMG/$id.webp")" -le "$MAX_WEBP_KB" ]; then
    out="$IMG/$id.webp"
  else
    rm "$IMG/$id.webp"
    ffmpeg -loglevel error -y -i "$gif" \
      -movflags +faststart -pix_fmt yuv420p -an \
      -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
      -c:v libx264 -preset slow -crf 23 "$IMG/$id.mp4"
    out="$IMG/$id.mp4"
  fi
  printf '%-32s %6d Ko -> %5d Ko  %s\n' "$id" "$kb" "$(size_kb "$out")" "${out##*.}"
  [ "$(dirname "$gif")" = "$ORIG" ] || mv "$gif" "$ORIG/"
done
