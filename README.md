# Job Application Workspace

A private, local-first workspace for tracking job applications, position details, submitted resumes, preparation reading, and interview questions.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Development

Install the dependencies after cloning the repository:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://127.0.0.1:4173` in a browser. The development server watches the source files and reloads the application when they change.

To use another port in PowerShell:

```powershell
$env:PORT=4175; npm run dev
```

## Production Build

Create an optimized production build:

```bash
npm run build
```

The final frontend output is written to the `dist/` directory. It contains the generated `index.html`, bundled JavaScript and CSS, and public assets.

Run the built application from the project root:

```bash
npm start
```

Then open `http://127.0.0.1:4173`. The production server serves the files from `dist/` and provides the local API used by the application, so opening `dist/index.html` directly is not supported.

## Local Data

On first launch, the server creates private runtime data files from the tracked templates in `data/`. Position records, resumes, uploaded logos, backups, and local caches remain inside `data/` and are excluded from Git.

## Verify

```bash
npm test
npm run build
```

## Project Context

- [Product brief](docs/product-brief.md)
- [User journeys](docs/user-journeys.md)
- [MVP and architecture](docs/mvp-and-architecture.md)
- [Roadmap](docs/roadmap.md)
