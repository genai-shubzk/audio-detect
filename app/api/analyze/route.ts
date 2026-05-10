import { NextResponse } from "next/server";
import { GoogleGenAI, createPartFromUri } from "@google/genai";
import {
  CLASSIFY_PROMPT,
  MAX_UPLOAD_BYTES,
  MODEL_NAME,
  RESPONSE_SCHEMA,
  type AnalysisResult,
} from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse multipart upload." },
      { status: 400 },
    );
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "No audio file provided." },
      { status: 400 },
    );
  }

  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
  }
  if (audio.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File is too large (${(audio.size / 1024 / 1024).toFixed(
          2,
        )} MB). Limit is ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      },
      { status: 413 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let uploadedName: string | undefined;
  try {
    const uploaded = await ai.files.upload({
      file: audio,
      config: { mimeType: "audio/mpeg" },
    });
    uploadedName = uploaded.name;

    let current = uploaded;
    const start = Date.now();
    while (current.state === "PROCESSING") {
      if (Date.now() - start > 50_000) {
        throw new Error("Timed out waiting for Gemini to process the audio.");
      }
      await new Promise((r) => setTimeout(r, 1000));
      current = await ai.files.get({ name: current.name as string });
    }
    if (current.state === "FAILED") {
      throw new Error("Gemini failed to process the uploaded audio.");
    }
    if (!current.uri || !current.mimeType) {
      throw new Error("Uploaded file is missing URI or MIME type.");
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        createPartFromUri(current.uri, current.mimeType),
        CLASSIFY_PROMPT,
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini.");
    }
    const parsed = JSON.parse(text) as AnalysisResult;
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (uploadedName) {
      ai.files.delete({ name: uploadedName }).catch(() => {});
    }
  }
}
