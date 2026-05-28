# Screenshots

This folder holds the screenshots embedded in the project's top‑level `README.md`.

The main README references files by relative path — drop a correctly‑named PNG in here and the README picks it up automatically.

## Shipped (currently embedded in the README)

| File              | Used in section                                | Source resolution |
| ----------------- | ---------------------------------------------- | ----------------- |
| `dashboard.png`   | Hero banner + §9 Dashboard + thumbnail grid    | 3164 × 1946       |
| `create-form.png` | §9 Create assignment form + thumbnail grid     | 3164 × 1946       |
| `groups.png`      | §9 Groups — class management + thumbnail grid  | 3164 × 1946       |
| `settings.png`    | §9 Settings page + thumbnail grid              | 3076 × 1858       |

The originals (uncropped, Retina) also live in [`readme ss/`](./readme%20ss/).

## Optional — additional screenshots that would strengthen the README

| Filename                       | Purpose                                                | Suggested viewport |
| ------------------------------ | ------------------------------------------------------ | ------------------ |
| `dashboard-empty.png`          | Zero‑state dashboard with illustration                 | 1440 × 900         |
| `create-form-difficulty.png`   | Form scrolled to the difficulty‑mix slider             | 1440 × 900         |
| `generating-state.png`         | An assignment mid‑generation with progress bar         | 1440 × 900         |
| `paper-output.png`             | A completed question paper in the dark output frame    | 1440 × 1400        |
| `paper-pdf.png`                | The browser's "Save as PDF" print preview              | 1200 × 1500        |
| `auth-signin.png`              | The email step of the sign‑in screen                   | 1200 × 900         |
| `auth-otp.png`                 | The 6‑digit OTP step                                   | 1200 × 900         |
| `mobile-dashboard.png`         | Dashboard at iPhone width                              | 390 × 844          |
| `mobile-drawer.png`            | Mobile sidebar drawer open                             | 390 × 844          |
| `mobile-paper.png`             | Output paper on mobile                                 | 390 × 1400         |

## How to capture cleanly

1. Run `npm run dev` in `backend/`, `backend/` (`dev:worker`) and `frontend/`.
2. Open Chrome → DevTools → toggle device toolbar → "Responsive" → set the recommended viewport.
3. Use `Cmd + Shift + P` → "Capture full size screenshot" for full‑page captures.
4. Save the PNG straight into this folder using the filename above.
