# maxence.fyi

Portfolio de Maxence Prioux, recodé en HTML/CSS (anciennement sur Framer) et publié avec GitHub Pages.

## Travailler sur le site

```bash
node tools/build.js          # version test dans test/ (avec les pastilles de problèmes)
node tools/serve.js test     # http://127.0.0.1:8424
```

Tout se modifie dans `src/`, jamais dans `test/` ni `dist/` (générés) :

| Dossier | Contenu |
| --- | --- |
| `src/pages/` | pages écrites à la main (`{{> partial}}`, `{{variable}}`) |
| `src/partials/` | morceaux partagés : head, header, profil, scripts |
| `src/projects/*.json` | contenu des études de cas |
| `src/templates/project.html` | modèle des études de cas |
| `src/static/` | CSS, JS, images, `data/photos.json` |

Ajouter une photo : déposer l'image dans `src/static/assets/img/` et ajouter une ligne dans `src/static/data/photos.json`.

## Mise en ligne

Chaque push sur `main` lance `.github/workflows/deploy.yml`, qui construit la version de production
(`node tools/build.js --prod`, sans éléments de test) et la publie sur GitHub Pages.

## Outils

- `tools/import-framer.py` : réimporte les études de cas depuis le site Framer (`--download` pour les images).
- `tools/convert-gifs.sh` : convertit les GIF lourds en MP4 (ffmpeg requis). Le build remplace ensuite
  les `<img src="….gif">` par des vidéos muettes en boucle. Les GIF d'origine sont gardés dans `src/originals/`.
- `tools/serve.js` : mini serveur local (le serveur Python est bloqué par le pare-feu macOS).
