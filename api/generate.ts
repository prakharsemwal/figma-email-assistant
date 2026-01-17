// api/generate.ts
// Deploy this to Vercel, Cloudflare Workers, or any serverless platform

import Anthropic from '@anthropic-ai/sdk';

// For Vercel deployment
export const config = {
  runtime: 'edge',
};

interface GenerateRequest {
  opportunity: {
    type: string;
    context: {
      productType?: string;
      userAction?: string;
      detectedVariables?: string[];
    };
  };
  brandColors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  brandVoice?: string;
}

export default async function handler(req: Request) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
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
    const body: GenerateRequest = await req.json();
    const { opportunity, brandColors, brandVoice = 'professional and friendly' } = body;

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Build the prompt
    const prompt = buildPrompt(opportunity, brandVoice);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    const parsed = parseEmailResponse(responseText);

    return new Response(
      JSON.stringify(parsed),
      { headers }
    );

  } catch (error) {
    console.error('Error generating email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers }
    );
  }
}

function buildPrompt(opportunity: any, brandVoice: string): string {
  const emailTypeDescriptions: { [key: string]: string } = {
    'welcome_email': 'a welcome email sent when a user signs up',
    'order_confirmation': 'an order confirmation email sent after purchase',
    'shipping_notification': 'a shipping notification with tracking info',
    'password_reset': 'a password reset email with secure link',
    'email_verification': 'an email verification message with link or code',
    'payment_failed': 'a payment failure notification',
    'subscription_renewal': 'a subscription renewal reminder',
    'account_deleted': 'an account deletion confirmation',
    'generic_transactional': 'a transactional notification email'
  };

  const description = emailTypeDescriptions[opportunity.type] || 'a transactional email';
  const variables = opportunity.context.detectedVariables || [];
  const userAction = opportunity.context.userAction || 'took an action';

  return `You are an expert email copywriter specializing in transactional emails.

Generate ${description} for a user who ${userAction}.

Requirements:
- Brand voice: ${brandVoice}
- Keep it concise and clear (150-250 words)
- Use a warm, helpful tone
- Include all necessary information
- Add a clear call-to-action if appropriate

${variables.length > 0 ? `Available variables: ${variables.map(v => `{{${v}}}`).join(', ')}` : ''}

Please respond with a JSON object containing:
{
  "subject": "email subject line (max 50 characters)",
  "body": "email body text with proper formatting and line breaks",
  "suggestedVariables": ["array", "of", "variables", "used"]
}

Make the subject line engaging but professional. Format the body with clear paragraphs and spacing.`;
}

function parseEmailResponse(response: string): { subject: string; body: string } {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || 'Your action was completed',
        body: parsed.body || 'Thank you for using our service.'
      };
    }
  } catch (e) {
    console.error('Failed to parse JSON response:', e);
  }

  // Fallback: try to extract subject and body from text
  const lines = response.split('\n');
  let subject = 'Your action was completed';
  let body = response;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('subject:')) {
      subject = lines[i].split(':')[1]?.trim() || subject;
      body = lines.slice(i + 1).join('\n').trim();
      break;
    }
  }

  return { subject, body };
}

// For Node.js environments (non-edge)
export async function POST(req: Request) {
  return handler(req);
}
