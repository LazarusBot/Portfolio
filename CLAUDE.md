# maxence.fyi

Maxence Prioux's portfolio: a static site built by `tools/build.js` from `src/`, deployed to GitHub Pages on every push to `main`.

## The team

Four bots live in `.claude/agents/`. Call them by name (`@root`, `@holly`, `@foaly`, `@butler`, or "ask Root to…").

| Bot | Role | Edits files? |
|---|---|---|
| **Root** | Senior product design interviewer: reviews the story, evidence and results of a case study | No |
| **Holly** | Visual designer: hierarchy, spacing, greys, type, alignment, mobile | Only when asked |
| **Foaly** | UI engineer: layouts, components, interactions, motion, accessibility | Yes |
| **Butler** | Software engineer: build, data, image weight, performance, deploys | Yes |

## Chores that need several bots

Bots can't call each other, so the main session runs the chain:

1. Pick the bots the chore needs, in this order unless the request says otherwise: **Root → Holly → Foaly → Butler** (think, then look, then build, then ship).
2. Run the first bot. Each bot ends its report with a **Hand-off** section (next bot, task, done when).
3. Pass each hand-off to the bot it names, with the previous reports' relevant findings, until a bot writes "Hand-off: none".
4. Butler commits and pushes only if the request asked for it to go live; otherwise stop before committing and say what's ready.
5. Report to Maxence in one summary: what each bot found or changed, what was checked, and what still needs his decision.

Skip bots that have nothing to do. A single-bot request ("ask Holly to check the Aer page") runs only that bot.

## House rules

- Commit messages in French; commit or push only when asked.
- Before any change goes live, build (`node tools/build.js`) and check it in the preview ("site-test" in `.claude/launch.json`) at 1280px and 375px.
- If a GitHub Pages deploy times out, push a fresh (empty) commit instead of re-running the old one.
- The home page is the Garage (`src/garage/entries.json`), in three sections: **Projects** (the product work, in the order of `src/garage/cards.html`), **Backlog** (dated milestones of the Podz app itself, taken from its repo in `~/Documents/42 /Programmation/SwiftUI/Podz`, newest first, 6 shown before "View more"; never changes to the portfolio), then **Brand work** (projects tagged `Brand`). When the Podz app reaches a real milestone, add one entry dated the day of that commit, in English, short and plain (`tag`, `title`, one-line `text`, `href` to the page; optional `media`). The title links to that page; the image only appears on hover, near the cursor. A new project gets an entry with its `slug` (and a card in `cards.html`) instead: it is listed under Projects, links to the case study and uses its card cover and GIF as the hover image.
