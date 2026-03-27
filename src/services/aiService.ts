import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeSpeechSample(audioBase64: string, taskType: string) {
  const prompt = `
    You are an expert Speech-Language Pathologist (SLP) assistant. 
    Analyze this speech sample for a motor speech assessment (Dysarthria/Apraxia).
    
    Task Type: ${taskType}
    
    Please provide a detailed clinical analysis in JSON format with the following keys:
    1. "transcription": The transcribed text (if connected speech).
    2. "intelligibility": A percentage (0-100%) based on how much of the speech is understandable.
    3. "naturalness": A rating from 1 (very unnatural) to 7 (completely natural).
    4. "acoustic_perceptual_analysis": {
        "pitch": "Description of pitch (e.g., monopitch, pitch breaks, high/low)",
        "loudness": "Description of volume (e.g., monoloudness, fading, excessive variations)",
        "quality": "Description of voice quality (e.g., breathy, harsh, strained, hypernasal)",
        "respiration": "Observations on breath support and coordination",
        "prosody": "Observations on rate, rhythm, and stress patterns",
        "articulation": "Observations on consonant precision and vowel distortion"
    }
    5. "phonation_metrics": {
        "stability": "For phonation tasks (/a/, /i/, /u/), comment on steadiness",
        "duration": "Estimated duration in seconds",
        "jitter": "Estimated jitter percentage (if phonatory task)",
        "shimmer": "Estimated shimmer in dB (if phonatory task)",
        "hnr": "Estimated HNR in dB (if phonatory task)",
        "f0": "Estimated fundamental frequency in Hz (if phonatory task)"
    }
    6. "articulation_analysis": {
        "pcc": "Percentage Consonant Correct (0-100) (if elicitation task)",
        "errors": [
            { "phoneme": "target", "substitution": "produced", "type": "substitution/omission/distortion" }
        ]
    }
    7. "clinical_summary": "A brief overall impression for the SLP."

    Ensure the output is ONLY the JSON object.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "audio/wav",
              data: audioBase64,
            },
          },
        ],
      },
    ],
  });

  return response.text;
}
