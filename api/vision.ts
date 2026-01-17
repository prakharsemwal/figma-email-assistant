// api/vision.ts
// AI Vision-powered design analysis endpoint
// Uses Claude's vision capabilities to analyze design screenshots

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  runtime: 'edge',
};

interface FrameImage {
  frameId: string;
  frameName: string;
  imageData: string; // base64 data URL
}

interface VisionRequest {
  frames: FrameImage[];
}

interface VisualAnalysis {
  frameId: string;
  frameName: string;
  designSummary: string;
  userFlowPurpose: string;
  keyElements: string[];
  suggestedEmailType: string;
  suggestedEmailName: string;
  emailContext: string;
  confidence: number;
}

export default async function handler(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    const body: VisionRequest = await req.json();
    const { frames } = body;

    if (!frames || frames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No frames provided' }),
        { status: 400, headers }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const analyses: VisualAnalysis[] = [];

    // Analyze each frame with vision
    for (const frame of frames) {
      try {
        const analysis = await analyzeFrameWithVision(anthropic, frame);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing frame ${frame.frameName}:`, error);
        analyses.push({
          frameId: frame.frameId,
          frameName: frame.frameName,
          designSummary: 'Analysis failed',
          userFlowPurpose: 'Unknown',
          keyElements: [],
          suggestedEmailType: 'generic_transactional',
          suggestedEmailName: 'Transactional Email',
          emailContext: '',
          confidence: 0.3
        });
      }
    }

    return new Response(
      JSON.stringify({ analyses }),
      { headers }
    );

  } catch (error) {
    console.error('Error in vision analysis:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to analyze frames',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers }
    );
  }
}

async function analyzeFrameWithVision(
  anthropic: Anthropic,
  frame: FrameImage
): Promise<VisualAnalysis> {
  // Extract base64 data from data URL
  const base64Data = frame.imageData.replace(/^data:image\/\w+;base64,/, '');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64Data
          }
        },
        {
          type: 'text',
          text: `Analyze this UI/UX design screenshot and provide insights.

Frame name: "${frame.frameName}"

Please analyze the design and respond with a JSON object:
{
  "designSummary": "A 2-3 sentence summary of what this screen shows and its purpose",
  "userFlowPurpose": "What step in the user journey this represents (e.g., 'User registration step 2 - email verification', 'Checkout - payment details')",
  "keyElements": ["array", "of", "key", "UI", "elements", "visible"],
  "suggestedEmailType": "One of: welcome_email, order_confirmation, shipping_notification, password_reset, email_verification, payment_failed, subscription_renewal, invoice, appointment_confirmation, feedback_request, abandoned_cart, generic_transactional",
  "suggestedEmailName": "Human-readable email name (e.g., 'Welcome Email', 'Order Confirmation')",
  "emailContext": "What context/data from this screen should be included in the email",
  "confidence": 0.0 to 1.0
}

Focus on understanding what action the user is taking and what transactional email would be triggered.
Return ONLY the JSON object, no other text.`
        }
      ]
    }]
  });

  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        frameId: frame.frameId,
        frameName: frame.frameName,
        designSummary: parsed.designSummary || 'No summary available',
        userFlowPurpose: parsed.userFlowPurpose || 'Unknown purpose',
        keyElements: Array.isArray(parsed.keyElements) ? parsed.keyElements : [],
        suggestedEmailType: parsed.suggestedEmailType || 'generic_transactional',
        suggestedEmailName: parsed.suggestedEmailName || 'Transactional Email',
        emailContext: parsed.emailContext || '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7
      };
    }
  } catch (e) {
    console.error('Failed to parse vision response:', e);
  }

  // Fallback response
  return {
    frameId: frame.frameId,
    frameName: frame.frameName,
    designSummary: responseText.slice(0, 200) || 'Could not analyze',
    userFlowPurpose: 'Unknown',
    keyElements: [],
    suggestedEmailType: 'generic_transactional',
    suggestedEmailName: 'Transactional Email',
    emailContext: '',
    confidence: 0.5
  };
}

export async function POST(req: Request) {
  return handler(req);
}
