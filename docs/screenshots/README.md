# Screenshots

This folder holds the screenshots embedded in the project's top‑level `README.md`.

Add files using the exact names below — the main README references them by relative path, so dropping a correctly‑named PNG in here is all you need to do.

## Required files (referenced by `/README.md`)

| Filename                          | Purpose                                                | Recommended viewport |
| --------------------------------- | ------------------------------------------------------ | -------------------- |
| `hero.png`                        | Banner image at the very top of the README             | 2560 × 1280 (Retina) |
| `dashboard-empty.png`             | Zero‑state dashboard with the illustration             | 1440 × 900           |
| `dashboard-filled.png`            | Dashboard with at least 3–4 assignment cards visible   | 1440 × 900           |
| `create-form.png`                 | The full Create Assignment form, scrolled to top       | 1440 × 1100          |
| `create-form-difficulty.png`      | The form scrolled to show the difficulty‑mix slider    | 1440 × 900           |
| `generating-state.png`            | An assignment mid‑generation with progress bar         | 1440 × 900           |
| `paper-output.png`                | A completed question paper in the dark output frame    | 1440 × 1400          |
| `paper-pdf.png`                   | The browser's "Save as PDF" print preview              | 1200 × 1500          |
| `auth-signin.png`                 | The email step of the sign‑in screen                   | 1200 × 900           |
| `auth-otp.png`                    | The 6‑digit OTP step                                   | 1200 × 900           |
| `settings.png`                    | The Settings → Profile page                            | 1440 × 900           |
| `mobile-dashboard.png`            | Dashboard at iPhone width                              | 390 × 844            |
| `mobile-drawer.png`               | Mobile sidebar drawer open                             | 390 × 844            |
| `mobile-paper.png`                | Output paper on mobile                                 | 390 × 1400           |

## How to capture cleanly

1. Run `npm run dev` in both `backend/` and `backend/` (`dev:worker`) and `frontend/`.
2. Open Chrome → DevTools → toggle device toolbar → "Responsive" → set the recommended viewport above.
3. Use `Cmd + Shift + P` → "Capture full size screenshot" for full‑page captures.
4. Save the PNG straight into this folder using the filename above.

All images are optional — the README is self‑contained and reads well without them, but adding them turns it into a portfolio‑quality submission.
