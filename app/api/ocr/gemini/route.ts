import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const OcrRequestSchema = z.object({
  imageBase64: z.string().min(10, 'Invalid image data payload'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  ocrHint: z.string().optional(),
});

interface GeminiOcrResult {
  expression: string;
  latex: string;
  confidence: number;
  explanation?: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    const body = await req.json();
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

    const ai = new GoogleGenAI({ apiKey });

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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

    const rawResponseText = response.text ? response.text.trim() : '';

    if (!rawResponseText) {
      return NextResponse.json(
        { error: 'Gemini did not return any recognized content' },
        { status: 502 }
      );
    }

    let parsedResult: GeminiOcrResult;
    try {
      parsedResult = JSON.parse(rawResponseText);
    } catch {
      // Fallback if JSON format was slightly imperfect
      parsedResult = {
        expression: rawResponseText.replace(/```json|```/g, '').trim(),
        latex: rawResponseText.replace(/```json|```/g, '').trim(),
        confidence: 0.85,
      };
    }

    // Clean any accidental wrap quotes or trailing punctuation
    const cleanExpr = (parsedResult.expression || '')
      .replace(/^["']|["']$/g, '')
      .replace(/;$/, '')
      .trim();

    return NextResponse.json({
      success: true,
      expression: cleanExpr,
      latex: parsedResult.latex || cleanExpr,
      confidence: Math.round((parsedResult.confidence || 0.95) * 100),
      provider: 'gemini-vision',
    });
  } catch (error: unknown) {
    console.error('Error in Gemini OCR API:', error);
    const message = error instanceof Error ? error.message : 'Failed to detect problem with Gemini Vision API';
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}

