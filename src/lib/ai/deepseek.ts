/**
 * DeepSeek-Flash Multimodal AI Service
 *
 * Implements portrait evaluation and comparison using the deepseek-flash vision capabilities.
 * Respects user privacy: images are passed entirely in-memory as Base64 data URLs, never written to disk.
 */

export interface PortraitMetric {
  name: string;
  score: string;
  note: string;
}

export interface PortraitAnalysisResult {
  overallScore: string;
  scoreLabel: string;
  metrics: PortraitMetric[];
  summaryHeading: string;
  summaryText: string;
  recommendations: string[];
}

export interface PortraitComparisonResult {
  winner: 'Photo A' | 'Photo B' | 'Tie';
  overallAssessment: string;
  photoA: {
    score: string;
    strengths: string[];
    weaknesses: string[];
  };
  photoB: {
    score: string;
    strengths: string[];
    weaknesses: string[];
  };
  verdictRecommendation: string;
}

function getDeepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-flash';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured in .env.local');
  }

  return { apiKey, baseUrl, model };
}

/**
 * Single portrait analysis with DeepSeek-Flash
 */
export async function analyzePortraitWithDeepSeek(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  mode: 'fast' | 'deep' = 'fast'
): Promise<PortraitAnalysisResult> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();

  const systemInstruction = `You are an elite portrait photographer and lighting consultant.
Analyze the uploaded portrait objectively.
Evaluate across 4 distinct visual dimensions:
1. Lighting Quality (softness, direction, shadows, exposure balance)
2. Framing & Composition (rule of thirds, eye-line, headroom, angles)
3. Facial Expression & Presence (authenticity, engagement, approachability)
4. Sharpness & Detail (focus accuracy on eyes, depth of field, noise)

You must respond ONLY with a valid JSON object strictly matching this schema:
{
  "overallScore": "8.4",
  "scoreLabel": "Overall Impression (Out of 10)",
  "metrics": [
    {
      "name": "Lighting Quality",
      "score": "8.5 / 10",
      "note": "Concise 1-2 sentence assessment of illumination and shadows."
    },
    {
      "name": "Framing & Composition",
      "score": "8.2 / 10",
      "note": "Concise 1-2 sentence assessment of angle and positioning."
    },
    {
      "name": "Facial Expression",
      "score": "8.8 / 10",
      "note": "Concise 1-2 sentence assessment of gaze, warmth, and posture."
    },
    {
      "name": "Sharpness & Detail",
      "score": "8.1 / 10",
      "note": "Concise 1-2 sentence assessment of ocular focus and clarity."
    }
  ],
  "summaryHeading": "Portrait Assessment Summary",
  "summaryText": "2-3 sentences of human, encouraging, professional photography advice.",
  "recommendations": [
    "Practical tip 1 to instantly improve the photo",
    "Practical tip 2 to instantly improve the photo"
  ]
}`;

  const promptText =
    mode === 'deep'
      ? 'Perform an in-depth, meticulous portrait evaluation across lighting, framing, expression, and optical sharpness. Return the JSON report.'
      : 'Perform a fast, concise portrait overview evaluation across lighting, framing, expression, and sharpness. Return the JSON report.';

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: promptText,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`,
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DeepSeek API returned error ${response.status}: ${errorBody}`);
  }

  const jsonResponse = await response.json();
  const rawContent = jsonResponse.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Empty response received from DeepSeek multimodal model');
  }

  try {
    return JSON.parse(rawContent) as PortraitAnalysisResult;
  } catch (err) {
    throw new Error(`Failed to parse DeepSeek response as JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Dual portrait comparison with DeepSeek-Flash
 */
export async function comparePortraitsWithDeepSeek(
  photoA: { base64: string; mimeType: string },
  photoB: { base64: string; mimeType: string }
): Promise<PortraitComparisonResult> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();

  const systemInstruction = `You are an elite portrait photographer comparing two portraits of a subject: Photo A (Baseline) and Photo B (Alternative).
Critique and compare both images on lighting, angle, expression, depth, and overall aesthetic impact.

You must respond ONLY with a valid JSON object strictly matching this schema:
{
  "winner": "Photo A" | "Photo B" | "Tie",
  "overallAssessment": "2-3 sentences detailing which image conveys higher presence and why.",
  "photoA": {
    "score": "8.2 / 10",
    "strengths": ["Key positive attribute 1", "Key positive attribute 2"],
    "weaknesses": ["Improvement area"]
  },
  "photoB": {
    "score": "8.8 / 10",
    "strengths": ["Key positive attribute 1", "Key positive attribute 2"],
    "weaknesses": ["Improvement area"]
  },
  "verdictRecommendation": "Clear, actionable recommendation for which one to use for professional or social profiles."
}`;

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Carefully compare these two portrait photos (the first image is Photo A, the second image is Photo B). Provide an objective, insightful side-by-side critique and declare the superior portrait.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${photoA.mimeType};base64,${photoA.base64}`,
            },
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${photoB.mimeType};base64,${photoB.base64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DeepSeek API returned error ${response.status}: ${errorBody}`);
  }

  const jsonResponse = await response.json();
  const rawContent = jsonResponse.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Empty response received from DeepSeek comparison model');
  }

  try {
    return JSON.parse(rawContent) as PortraitComparisonResult;
  } catch (err) {
    throw new Error(`Failed to parse DeepSeek comparison JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}
