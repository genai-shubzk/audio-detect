# Audio Authenticity Detector

A Next.js + React app that uses Google's Gemini API to judge whether an uploaded MP3 contains a human voice or AI-synthesized speech. Designed to deploy to Vercel in one click.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS
- `@google/genai` (Google Gen AI SDK for Node.js)
- TypeScript

## Local development

1. Install dependencies:
   ```sh
   npm install
   ```
2. Set your Gemini API key in `.env.local` (already created — get a key at https://aistudio.google.com/apikey):
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Run the dev server:
   ```sh
   npm run dev
   ```
4. Open http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub (or import the directory directly via the Vercel dashboard).
2. In Vercel project settings, add an environment variable:
   - `GEMINI_API_KEY` — your Gemini API key
3. Deploy. Vercel auto-detects Next.js.

## Upload limit

The app caps uploads at **4 MB** to stay within Vercel's Hobby-tier Serverless Function body limit (4.5 MB). For typical voice clips at 128 kbps that's ~4 minutes of audio.

To raise it on Vercel Pro, change `MAX_UPLOAD_BYTES` in [lib/schema.ts](lib/schema.ts) and `bodySizeLimit` in [next.config.ts](next.config.ts).

## How it works

Client uploads MP3 → POST `/api/analyze` (multipart) → server uploads to Gemini File API → polls until `ACTIVE` → calls `gemini-2.5-flash` with the audio + a forensic-analyst prompt + a JSON schema → returns structured `{ classification, confidence, rationale, indicators }` → React renders the verdict.

The Gemini File API key is kept server-side; the browser never sees it.

## Disclaimer

This is a heuristic judgment, not a forensic guarantee. Don't use it to make consequential decisions on its own.
