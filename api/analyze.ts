// api/analyze.ts
// AI-powered flow analysis endpoint
// Deploy this alongside generate.ts

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  runtime: 'edge',
};

interface FrameData {
  name: string;
  id: string;
  textContent: string[];
  childNodes: { name: string; type: string }[];
  dimensions: { width: number; height: number };
}

interface AnalyzeRequest {
  frames: FrameData[];
}

interface FlowAnalysis {
  frameId: string;
  frameName: string;
  detectedPurpose: string;
  suggestedEmailType: string;
  suggestedEmailName: string;
  confidence: number;
  reasoning: string;
  suggestedVariables: string[];
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
    const body: AnalyzeRequest = await req.json();
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

    const prompt = buildAnalysisPrompt(frames);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const analysis = parseAnalysisResponse(responseText, frames);

    return new Response(
      JSON.stringify({ analysis }),
      { headers }
    );

  } catch (error) {
    console.error('Error analyzing frames:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to analyze frames',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers }
    );
  }
}

function buildAnalysisPrompt(frames: FrameData[]): string {
  const frameDescriptions = frames.map((frame, index) => {
    const textSample = frame.textContent.slice(0, 10).join(', ');
    const childSample = frame.childNodes.slice(0, 5).map(n => n.name).join(', ');

    return `
Frame ${index + 1}:
- Name: "${frame.name}"
- ID: ${frame.id}
- Dimensions: ${frame.dimensions.width}x${frame.dimensions.height}
- Text content found: [${textSample}${frame.textContent.length > 10 ? '...' : ''}]
- Child elements: [${childSample}${frame.childNodes.length > 5 ? '...' : ''}]
`;
  }).join('\n');

  return `You are an expert product designer and UX analyst. Analyze these Figma frames and identify what product flow or user journey each frame represents.

For each frame, determine:
1. The purpose of this screen in a product flow
2. What transactional email would be triggered by this flow
3. What variables/data would be relevant for that email

Available email types:
- welcome_email: User just signed up
- order_confirmation: User completed a purchase
- shipping_notification: Order has shipped
- password_reset: User requested password reset
- email_verification: User needs to verify email
- payment_failed: Payment was declined
- subscription_renewal: Subscription is renewing
- account_deleted: Account was deleted
- invoice: Billing/invoice email
- appointment_confirmation: Booking/appointment made
- feedback_request: Ask for user feedback
- abandoned_cart: User left items in cart
- generic_transactional: Other transactional email

Frames to analyze:
${frameDescriptions}

Respond with a JSON array of analysis objects:
[
  {
    "frameId": "the frame ID",
    "frameName": "the frame name",
    "detectedPurpose": "Brief description of what this screen is for (e.g., 'User registration form', 'Checkout payment page')",
    "suggestedEmailType": "one of the email types above",
    "suggestedEmailName": "Human readable name (e.g., 'Welcome Email', 'Order Confirmation')",
    "confidence": 0.0 to 1.0,
    "reasoning": "Why you identified it this way",
    "suggestedVariables": ["user_name", "order_id", "etc"]
  }
]

If a frame doesn't seem to be related to any email-triggering flow, still include it but with confidence < 0.5 and suggestedEmailType: "generic_transactional".

Return ONLY the JSON array, no other text.`;
}

function parseAnalysisResponse(response: string, frames: FrameData[]): FlowAnalysis[] {
  try {
    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any) => ({
        frameId: item.frameId || '',
        frameName: item.frameName || '',
        detectedPurpose: item.detectedPurpose || 'Unknown purpose',
        suggestedEmailType: item.suggestedEmailType || 'generic_transactional',
        suggestedEmailName: item.suggestedEmailName || 'Transactional Email',
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        reasoning: item.reasoning || '',
        suggestedVariables: Array.isArray(item.suggestedVariables) ? item.suggestedVariables : []
      }));
    }
  } catch (e) {
    console.error('Failed to parse analysis response:', e);
  }

  // Fallback: return basic analysis for each frame
  return frames.map(frame => ({
    frameId: frame.id,
    frameName: frame.name,
    detectedPurpose: 'Could not analyze',
    suggestedEmailType: 'generic_transactional',
    suggestedEmailName: 'Transactional Email',
    confidence: 0.3,
    reasoning: 'AI analysis failed, using fallback',
    suggestedVariables: []
  }));
}

export async function POST(req: Request) {
  return handler(req);
}
