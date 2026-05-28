# Supabase email templates

Branded email templates for the Supabase auth flow used by VedaAI.

The OTP digits are pure black (not the orange brand colour — orange on a 6‑digit code reads "promotional" and is hard to scan). The brand only shows in the icon at the top.

## Files

| File             | Paste into Supabase dashboard at…                                      |
| ---------------- | ---------------------------------------------------------------------- |
| `magic-link.html`| **Authentication → Email Templates → Magic Link**                      |
|                  | **Authentication → Email Templates → Confirm signup** (same template)  |

Both `Magic Link` and `Confirm signup` use the same `{{ .Token }}` variable, so a single template covers the entire sign‑in‑and‑signup OTP flow.

## How to install (60 seconds)

1. Open your Supabase project → **Authentication → Email Templates**.
2. Pick the template you want to update (start with **Magic Link**).
3. Open `magic-link.html` from this folder and copy the entire file contents.
4. Paste into the dashboard's HTML editor (it replaces the default template).
5. Click **Save**.
6. Repeat for **Confirm signup** if you also use email sign‑up.

## Customising the logo

The template references the new app icon at:

```
https://veda-milan-assignment.vercel.app/icon.png
```

If your deployment URL is different, search for that string in the HTML and replace it with your own absolute URL. The image **must** be publicly reachable from the internet — Gmail and Outlook strip `data:` URIs from `<img>` tags.

If you need to host the icon somewhere stable, two easy options:

- **Vercel** (default): the icon at `/icon.png` is already served by the deployed Next.js app — nothing else to do.
- **GitHub raw**: push the repo to GitHub and use `https://raw.githubusercontent.com/<user>/VedaAI/main/frontend/public/icon.png` as the URL.

## What the email looks like

- Light card on a soft off‑white background
- New app icon (72 × 72, rounded‑16)
- "Your sign-in code" headline in near‑black
- **OTP digits in pure black**, 38 px, monospace, generous letter‑spacing — exactly as a verification code should look
- "Sign in to VedaAI →" pill button as a one‑click magic‑link fallback
- Safety footer explaining what to do if the recipient didn't request the code

## Why a separate file (instead of editing Supabase directly)

Supabase email templates live in the dashboard, not in the repo. Keeping the HTML in `docs/supabase/` means:

- The template is version‑controlled alongside the app
- Reviewers can see what the actual sign‑in email looks like without logging into Supabase
- A new contributor can re‑install the brand by copy‑pasting one file
