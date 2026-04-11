# Contributing to Jamā'ah Journal

Thanks for helping improve Jamā'ah Journal. This document explains how to set up the project, propose changes, and open pull requests.

## Code of conduct

Be respectful and constructive. Assume good intent. Harassment and hate speech are not tolerated.

## Ways to contribute

- **Bug reports**: Open an issue with steps to reproduce, expected vs actual behavior, and your environment (browser, OS, Node version).
- **Feature ideas**: Open an issue first so maintainers can align on scope and UX before you invest large amounts of work.
- **Pull requests**: Small, focused PRs are easier to review than large refactors.

## Prerequisites

- **Node.js** 16 or newer (LTS recommended)
- **npm** (comes with Node)
- A **Firebase** project if you work on auth, Firestore, or anything that touches the backend integration (use your own dev project; never commit real production keys)

## Local setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/Abrar-Husain-870/Jam-ah-Journal-2.0.git
   cd Jam-ah-Journal-2.0
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create **`.env.local`** in the project root with your Firebase web app config (see the main [README](./README.md)).  
   - **Do not commit** `.env.local` or paste secrets into issues or PRs.

4. Run the app:
   ```bash
   npm start
   ```
   The app runs at [http://localhost:3000](http://localhost:3000).

5. Production build check (recommended before a PR):
   ```bash
   npm run build
   ```

## Tests

```bash
npm test
```

Run tests in interactive mode as provided by Create React App. If you add or fix behavior, add or update tests when it makes sense for the change.

## Project conventions

- **Stack**: React 18 (Create React App), Tailwind CSS, Firebase (Auth + Firestore), Chart.js, Lucide icons. See [README](./README.md) for structure.
- **Style**: Match existing patterns in the codebase (component layout, Tailwind usage, naming). Prefer small, readable changes over drive-by refactors.
- **Accessibility**: Preserve keyboard use, focus behavior, and `aria` where the app already uses them.
- **Performance**: Avoid unnecessary re-renders and heavy animation on low-end devices unless discussed.
- **i18n**: The app is primarily English; keep copy clear and respectful of religious context.

## What not to commit

- Secrets: `.env.local`, API keys, service account JSON
- Unrelated files: editor junk, large binaries, personal notes
- **Do not** run `npm run eject` **in a PR without explicit maintainer agreement** (it is irreversible for the repo).

## Pull request process

1. **Branch**: Create a branch from `main` (or the default branch), e.g. `fix/calendar-offline-banner` or `feat/insights-export`.
2. **Commits**: Write clear messages (what changed and why). One logical change per commit is ideal.
3. **Before opening a PR**:
   - `npm run build` succeeds
   - You’ve manually tested flows your change touches (login, journal, insights, etc.)
4. **PR description** should include:
   - What problem this solves or what feature it adds
   - How to test it
   - Screenshots or screen recordings for UI changes (if applicable)
5. **Review**: Maintainers may request changes; keeping PRs small speeds this up.

## License

By contributing, you agree that your contributions are licensed under the same license as the project: **[MIT](./LICENSE)**. See also [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for third-party libraries.

## Questions

- **Issues**: [GitHub Issues](https://github.com/Abrar-Husain-870/Jam-ah-Journal-2.0/issues)

Thank you for helping build Jamā'ah Journal for the community.
