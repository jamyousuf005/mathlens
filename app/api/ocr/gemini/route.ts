import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const MAX_IMAGE_BASE64_LENGTH = 8_000_000;

const OcrRequestSchema = z.object({
  imageBase64: z
    .string()
    .min(10, 'Invalid image data payload')
    .max(MAX_IMAGE_BASE64_LENGTH, 'Image is too large'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  ocrHint: z.string().max(200, 'OCR hint is too long').optional(),
});

const GeminiOcrResultSchema = z.object({
  expression: z.string().min(1).max(300),
  latex: z.string().max(1000).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // Protect OCR quota: max 30 OCR requests per minute per client
    const rate = checkRateLimit(`ocr:${clientIp}`, 30, 60_000);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many OCR requests. Please slow down and try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rate.reset) } }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!geminiApiKey && !groqApiKey) {
      return NextResponse.json(
        { error: 'No OCR vision provider API keys configured on the server' },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = OcrRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType, ocrHint } = validation.data;

    // Sanitize base64 (strip data URI prefix if provided)
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const systemPrompt = `You are a high-precision Mathematical OCR and Formula Detection engine.
Your objective is to examine an image of handwritten notes or printed math worksheets and extract the exact mathematical problem.

Strict extraction rules:
1. Return ONLY a valid JSON object matching the requested schema.
2. In "expression", output the mathematical formula in standard normalized single-line notation (e.g. "2x^2 + 5x - 3 = 0" or "x^2 + 4x + 4 = 0" or "3 * (4 + 5) / 2"). Use '^' for exponents. Avoid markdown fences.
3. In "latex", output the standard valid LaTeX representation (e.g. "2x^2 + 5x - 3 = 0" or "\\int x \\sin(x) dx").
4. In "confidence", output a float between 0.0 and 1.0 representing your certainty.
5. If the user provided a weak local OCR hint, use it as a reference if ambiguous, but trust the image visual features first.
${ocrHint ? `Local OCR tentative hint: "${ocrHint}"` : ''}
`;

    // Spec default model is gemini-2.5-flash
    const targetModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    let rawResponseText = '';
    let providerUsed = 'gemini-vision';

    // 1. Attempt Gemini Vision with a 15-second timeout
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const geminiPromise = ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                {
                  inlineData: {
                    data: base64Data,
                    mimeType,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        // 15-second abort guard to prevent stalled connections
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini OCR request timed out after 15s')), 15_000)
        );

        const response = await Promise.race([geminiPromise, timeoutPromise]);
        rawResponseText = response.text ? response.text.trim() : '';
      } catch (geminiError: unknown) {
        console.warn('Gemini OCR primary attempt failed, evaluating fallback:', geminiError);
      }
    }

    // 2. Groq Vision Fallback if Gemini failed, timed out, or key was missing
    if (!rawResponseText && groqApiKey) {
      try {
        const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: groqModel,
            max_tokens: 300,
            temperature: 0.1,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `${systemPrompt}\nOutput strictly valid JSON with keys "expression", "latex", and "confidence". Do not wrap in markdown or explanation.`,
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
          }),
        });

        clearTimeout(timeoutId);

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const groqContent = groqData.choices?.[0]?.message?.content;
          if (groqContent) {
            rawResponseText = groqContent.trim();
            providerUsed = 'groq-vision';
          }
        } else {
          const groqErr = await groqRes.text();
          console.warn('Groq Vision API returned non-OK status:', groqRes.status, groqErr);
        }
      } catch (groqError: unknown) {
        console.error('Groq fallback attempt failed:', groqError);
      }
    }

    if (!rawResponseText) {
      return NextResponse.json(
        { error: 'Vision OCR service could not extract mathematical content' },
        { status: 502 }
      );
    }

    let parsedResult: z.infer<typeof GeminiOcrResultSchema>;
    try {
      parsedResult = GeminiOcrResultSchema.parse(JSON.parse(rawResponseText));
    } catch {
      const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = GeminiOcrResultSchema.parse(JSON.parse(jsonMatch[0]));
        } catch {
          return NextResponse.json(
            { error: 'OCR service returned an invalid JSON schema' },
            { status: 502 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'OCR service returned non-structured response' },
          { status: 502 }
        );
      }
    }

    // Clean any accidental wrap quotes or trailing punctuation
    const cleanExpr = (parsedResult.expression || '')
      .replace(/^["']|["']$/g, '')
      .replace(/;$/, '')
      .trim();

    if (cleanExpr.length < 2) {
      return NextResponse.json(
        { error: 'OCR service returned an unusable result' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      expression: cleanExpr,
      latex: parsedResult.latex || cleanExpr,
      confidence: Math.round((parsedResult.confidence ?? 0.95) * 100),
      provider: providerUsed,
    });
  } catch (error: unknown) {
    console.error('Error in OCR API pipeline:', error);
    return NextResponse.json(
      { error: 'OCR service is temporarily unavailable' },
      { status: 502 }
    );
  }
}

