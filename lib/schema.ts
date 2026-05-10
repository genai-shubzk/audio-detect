export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MODEL_NAME = "gemini-2.5-flash";

export const CLASSIFY_PROMPT = `You are an audio forensics analyst. Listen to the attached audio
and decide whether the voice(s) are most likely produced by a real human or
synthesized by an AI / text-to-speech / voice-cloning system.

Consider cues such as:
- Natural breathing, lip noises, micro-pauses, mouth/room sounds
- Prosody: pitch variation, stress patterns, emotional inflection
- Coarticulation and natural disfluencies (ums, false starts, repairs)
- Spectral artifacts: unnatural smoothness, robotic timbre, missing high-frequency
  noise, repeating phase patterns, vocoder buzz, abrupt phoneme boundaries
- Background ambience consistency vs. clean/sterile background
- Pacing that feels metronomic or unnaturally even

Return ONLY JSON matching the provided schema. Confidence is your probability
estimate (0.0 to 1.0) that the classification is correct.`;

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    classification: { type: "string", enum: ["Human", "AI"] },
    confidence: { type: "number" },
    rationale: { type: "string" },
    indicators: { type: "array", items: { type: "string" } },
  },
  required: ["classification", "confidence", "rationale", "indicators"],
} as const;

export type AnalysisResult = {
  classification: "Human" | "AI";
  confidence: number;
  rationale: string;
  indicators: string[];
};
