# Chidozie Immanuel — Creative Portfolio

[Live portfolio](https://immanuels-portfolio.vercel.app/)

A static portfolio of animation, digital art, music, and front-end work. Vercel serves the repository root directly: there is no install or build step. For local testing, run `python3 -m http.server 8000` from this folder.

- `index.html` contains the portfolio copy, project cards, partner logos, and toolkit.
- `style.css` defines the dark and light themes. The light theme’s contour artwork is a static symbol in `icons.svg`, reused in the header and contact section.
- `script.js` handles the theme switch, motion preferences, project filters, and media viewer.
- `images/web/` holds the display-sized WebP assets; full-size project images and the two original soundtracks remain available on demand. Font licenses are included in `fonts/`.

Each project card’s `data-media` selects its viewer (`image`, `still`, `audio`, or `video`). For a restored film, add the original file at the card’s `data-video` path before switching that card to `video`.
