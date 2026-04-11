# Third-party notices

This application is **MIT licensed** (see [`LICENSE`](./LICENSE)). It bundles and depends on open-source packages that are **not** covered by that single file; each has its own license.

## Direct dependencies (npm)

| Package | SPDX license | Notes |
|--------|----------------|--------|
| `react` | MIT | |
| `react-dom` | MIT | |
| `react-scripts` | MIT | Create React App toolchain |
| `chart.js` | MIT | |
| `react-chartjs-2` | MIT | |
| `chartjs-plugin-zoom` | MIT | |
| `firebase` | Apache-2.0 | Firebase JavaScript SDK |
| `lucide-react` | ISC | Icons |
| `react-calendar` | MIT | |
| `tailwindcss` | MIT | |
| `postcss` | MIT | |
| `autoprefixer` | MIT | |

Full license texts for these packages are in `node_modules/<package-name>/LICENSE*` (or `LICENSE.md`, `LICENCE`, etc.) after you run `npm install`.

## Fonts (loaded in the app)

Web fonts such as **Plus Jakarta Sans**, **Inter**, and **Amiri** are typically served under the **SIL Open Font License (OFL)** when loaded from Google Fonts or similar providers. See the font provider’s documentation for the exact OFL terms.

## Updating this list

When you add or upgrade dependencies, run:

```bash
npm ls --depth=0
```

and check each package’s `package.json` `"license"` field or its `LICENSE` file in `node_modules`.
