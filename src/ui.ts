// UI code - runs in iframe with access to browser APIs but NOT Figma document

let opportunities: any[] = [];
let brandColors: any = {};
let currentOpportunity: any = null;
let aiAnalysis: Map<string, any> = new Map(); // Store AI analysis by frame ID

// Listen for messages from plugin code
window.onmessage = async (event: MessageEvent) => {
  console.log('Message received:', event.data);
  const msg = event.data.pluginMessage;

  if (!msg) {
    console.log('No pluginMessage in event');
    return;
  }

  if (msg.type === 'opportunities-detected') {
    console.log('Opportunities detected:', msg.opportunities);
    opportunities = msg.opportunities;
    brandColors = msg.brandColors;
    renderOpportunities();
  }
};

// Setup when UI loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up event listeners');

  // Attach event listeners to buttons
  document.getElementById('refresh-btn')?.addEventListener('click', refreshOpportunities);
  document.getElementById('ai-analyze-btn')?.addEventListener('click', analyzeWithAI);
  document.getElementById('close-btn')?.addEventListener('click', closeGenerator);
  document.getElementById('regenerate-btn')?.addEventListener('click', regenerateCopy);
  document.getElementById('insert-btn')?.addEventListener('click', insertIntoFigma);

  // Request initial scan
  console.log('Requesting initial scan');
  parent.postMessage({
    pluginMessage: {
      type: 'detect-opportunities'
    }
  }, '*');
});

function renderOpportunities() {
  const container = document.getElementById('opportunities-list');
  
  if (!container) return;
  
  if (opportunities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✨</div>
        <div class="empty-state-title">No opportunities found</div>
        <div class="empty-state-text">Try designing a signup flow, checkout screen, or password reset</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = opportunities.map(opp => `
    <div class="opportunity-card" onclick="generateEmail('${opp.id}')">
      <div class="opportunity-header">
        <div class="opportunity-type">${opp.aiAnalysis?.suggestedEmailName || _formatEmailType(opp.type)}</div>
        <div class="confidence-badge">${Math.round(opp.confidence * 100)}%</div>
      </div>
      <div class="opportunity-frame">📐 ${opp.frameName}</div>
      ${opp.aiAnalysis ? `
        <div class="ai-analysis">
          <div class="ai-analysis-label">🤖 AI Analysis</div>
          <div class="ai-analysis-purpose">${opp.aiAnalysis.detectedPurpose}</div>
          <div class="ai-analysis-reasoning">${opp.aiAnalysis.reasoning}</div>
        </div>
      ` : `
        <div class="opportunity-context">
          ${opp.context.userAction ? `Action: ${opp.context.userAction}` : ''}
        </div>
      `}
      ${opp.frameContent ? `
        <div class="frame-content-preview">
          <div class="frame-content-title">📄 Detected Text:</div>
          <div class="frame-content-text">${opp.frameContent.textContent.slice(0, 5).join(' | ') || 'No text found'}${opp.frameContent.textContent.length > 5 ? ' ...' : ''}</div>
        </div>
      ` : ''}
      <button class="btn" onclick="event.stopPropagation(); generateEmail('${opp.id}')">
        Generate Email
      </button>
    </div>
  `).join('');
}

function _formatEmailType(type: string): string {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

async function generateEmail(opportunityId: string) {
  currentOpportunity = opportunities.find(o => o.id === opportunityId);
  
  if (!currentOpportunity) return;
  
  // Show generator modal
  const modal = document.getElementById('generator-modal');
  const mainView = document.getElementById('main-view');
  if (modal) modal.classList.add('active');
  if (mainView) mainView.style.display = 'none';
  
  // Update email type display
  const emailTypeEl = document.getElementById('email-type');
  if (emailTypeEl) {
    emailTypeEl.textContent = _formatEmailType(currentOpportunity.type);
  }
  
  // Show loading state
  const loadingEl = document.getElementById('loading-state');
  if (loadingEl) loadingEl.style.display = 'block';
  
  const subjectInput = document.getElementById('subject-input') as HTMLInputElement;
  const bodyInput = document.getElementById('body-input') as HTMLTextAreaElement;
  
  if (subjectInput) subjectInput.value = 'Generating...';
  if (bodyInput) bodyInput.value = 'Generating email copy...';
  
  // Generate copy using AI
  try {
    const { subject, body } = await callAIAPI(currentOpportunity);
    
    if (subjectInput) subjectInput.value = subject;
    if (bodyInput) bodyInput.value = body;
  } catch (error) {
    console.error('Error generating copy:', error);
    if (subjectInput) subjectInput.value = 'Error generating subject';
    if (bodyInput) bodyInput.value = 'Error generating email copy. Please try again.';
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

async function callAIAPI(opportunity: any) {
  // This is where you'd call your backend API
  // For now, we'll use mock data
  
  // In production, this would be:
  // const response = await fetch('https://your-api.com/generate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ opportunity, brandColors })
  // });
  // return await response.json();
  
  // Mock AI response for development
  return new Promise<{ subject: string; body: string }>((resolve) => {
    setTimeout(() => {
      const mockResponses: { [key: string]: { subject: string; body: string } } = {
        'welcome_email': {
          subject: 'Welcome to [Product Name]! 🎉',
          body: `Hi {{user_name}},

Welcome aboard! We're thrilled to have you join [Product Name].

Here's what to do next:

1. Verify your email
   Click the link below to confirm your account:
   {{verify_link}}

2. Complete your profile
   Add your details to get personalized recommendations

3. Explore features
   Check out our getting started guide

Need help? Just reply to this email and we'll get back to you.

Best regards,
The [Product Name] Team`
        },
        'order_confirmation': {
          subject: 'Order #{{order_number}} confirmed! 📦',
          body: `Hi {{customer_name}},

Great news! Your order is confirmed.

Order Details:
Order #: {{order_number}}
Total: $${'total'}
Expected Delivery: {{delivery_date}}

Items:
{{items}}

Shipping Address:
{{shipping_address}}

Track your order: [Track Order Button]

Questions? We're here to help - just reply to this email.

Thanks for your order!
The [Product Name] Team`
        },
        'password_reset': {
          subject: 'Reset your password',
          body: `Hi {{user_name}},

We received a request to reset your password.

Click the link below to create a new password:
{{reset_link}}

This link expires in {{expiry_time}}.

If you didn't request this, you can safely ignore this email.

Best regards,
The [Product Name] Team`
        },
        'email_verification': {
          subject: 'Please verify your email address',
          body: `Hi {{user_name}},

Thanks for signing up! Please verify your email address to get started.

Click here to verify:
{{verification_link}}

Or use this code: {{verification_code}}

This verification link expires in 24 hours.

If you didn't create an account, you can ignore this email.

Best regards,
The [Product Name] Team`
        },
        'generic_transactional': {
          subject: 'Action required: [Action Name]',
          body: `Hi there,

We wanted to let you know that your action was received.

[Customize this email based on your specific use case]

Next steps:
• [Step 1]
• [Step 2]
• [Step 3]

Questions? Reply to this email.

Best regards,
The Team`
        }
      };
      
      const response = mockResponses[opportunity.type] || mockResponses['generic_transactional'];
      resolve(response);
    }, 2000); // Simulate API delay
  });
}

function closeGenerator() {
  const modal = document.getElementById('generator-modal');
  const mainView = document.getElementById('main-view');
  if (modal) modal.classList.remove('active');
  if (mainView) mainView.style.display = 'block';
  currentOpportunity = null;
}

function regenerateCopy() {
  if (currentOpportunity) {
    generateEmail(currentOpportunity.id);
  }
}

function insertIntoFigma() {
  const subjectInput = document.getElementById('subject-input') as HTMLInputElement;
  const bodyInput = document.getElementById('body-input') as HTMLTextAreaElement;
  
  if (!subjectInput || !bodyInput || !currentOpportunity) return;
  
  // Send to plugin code to create Figma frame
  parent.postMessage({
    pluginMessage: {
      type: 'create-email',
      emailType: currentOpportunity.type,
      subject: subjectInput.value,
      body: bodyInput.value
    }
  }, '*');
  
  // Close modal
  closeGenerator();
}

async function analyzeWithAI() {
  // First, request a scan of ALL frames
  const container = document.getElementById('opportunities-list');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <div class="empty-state-title">Scanning all frames...</div>
      </div>
    `;
  }

  // Request scan with scanAll flag
  parent.postMessage({
    pluginMessage: {
      type: 'detect-opportunities',
      scanAll: true
    }
  }, '*');

  // Wait for opportunities to be populated
  await new Promise(resolve => setTimeout(resolve, 500));

  const apiUrlInput = document.getElementById('api-url') as HTMLInputElement;
  const apiUrl = apiUrlInput?.value?.trim();

  if (!apiUrl) {
    // Show inline mock AI analysis for demo
    console.log('No API URL provided, using mock AI analysis');
    await mockAIAnalysis();
    return;
  }

  // Show loading state
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <div class="empty-state-title">🤖 AI is analyzing your frames...</div>
        <div class="empty-state-text">This may take a few seconds</div>
      </div>
    `;
  }

  try {
    // Prepare frame data for AI
    const framesData = opportunities.map(opp => ({
      name: opp.frameName,
      id: opp.frameId,
      textContent: opp.frameContent?.textContent || [],
      childNodes: opp.frameContent?.childNodes || [],
      dimensions: opp.frameContent?.dimensions || { width: 0, height: 0 }
    }));

    console.log('Sending frames to AI:', framesData);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames: framesData })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI analysis response:', data);

    // Store AI analysis results
    if (data.analysis && Array.isArray(data.analysis)) {
      aiAnalysis.clear();
      for (const item of data.analysis) {
        aiAnalysis.set(item.frameId, item);

        // Update the opportunity with AI analysis
        const opp = opportunities.find(o => o.frameId === item.frameId);
        if (opp) {
          opp.aiAnalysis = item;
          opp.type = item.suggestedEmailType;
          opp.confidence = item.confidence;
        }
      }
    }

    // Re-render with AI analysis
    renderOpportunities();

  } catch (error) {
    console.error('AI analysis error:', error);

    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">AI Analysis Failed</div>
          <div class="empty-state-text">${(error as Error).message}</div>
        </div>
      `;
    }
  }
}

async function mockAIAnalysis() {
  // Show loading state
  const container = document.getElementById('opportunities-list');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <div class="empty-state-title">🤖 AI is analyzing your frames...</div>
        <div class="empty-state-text">Demo mode - using mock analysis</div>
      </div>
    `;
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Generate mock AI analysis based on frame names
  aiAnalysis.clear();
  for (const opp of opportunities) {
    const analysis = generateMockAnalysis(opp);
    aiAnalysis.set(opp.frameId, analysis);
    opp.aiAnalysis = analysis;
    opp.type = analysis.suggestedEmailType;
    opp.confidence = analysis.confidence;
  }

  renderOpportunities();
}

function generateMockAnalysis(opp: any): any {
  const name = opp.frameName.toLowerCase();
  const textContent = opp.frameContent?.textContent || [];
  const allText = textContent.join(' ').toLowerCase();

  // AI-like analysis based on content
  let analysis = {
    frameId: opp.frameId,
    frameName: opp.frameName,
    detectedPurpose: 'General product screen',
    suggestedEmailType: 'generic_transactional',
    suggestedEmailName: 'Transactional Email',
    confidence: 0.6,
    reasoning: 'Analyzed frame name and content patterns',
    suggestedVariables: ['user_name']
  };

  // Signup/Registration patterns
  if (name.match(/sign.?up|register|create.?account|join|onboard/i) ||
      allText.match(/sign.?up|register|create.?account|join|password|email/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'User registration/signup flow',
      suggestedEmailType: 'welcome_email',
      suggestedEmailName: 'Welcome Email',
      confidence: 0.92,
      reasoning: 'Detected signup-related keywords in frame name and content',
      suggestedVariables: ['user_name', 'email', 'verification_link']
    };
  }
  // Order/Checkout patterns
  else if (name.match(/order|checkout|cart|purchase|buy|payment/i) ||
           allText.match(/order|total|price|quantity|checkout|payment|card/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'E-commerce checkout/order flow',
      suggestedEmailType: 'order_confirmation',
      suggestedEmailName: 'Order Confirmation',
      confidence: 0.95,
      reasoning: 'Detected e-commerce and order-related patterns',
      suggestedVariables: ['customer_name', 'order_number', 'order_total', 'items', 'shipping_address']
    };
  }
  // Password reset patterns
  else if (name.match(/password|reset|forgot|recover/i) ||
           allText.match(/password|reset|forgot|recover|email/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'Password reset/recovery flow',
      suggestedEmailType: 'password_reset',
      suggestedEmailName: 'Password Reset',
      confidence: 0.9,
      reasoning: 'Detected password recovery patterns',
      suggestedVariables: ['user_name', 'reset_link', 'expiry_time']
    };
  }
  // Booking/Appointment patterns
  else if (name.match(/book|appointment|schedule|reservation|calendar/i) ||
           allText.match(/book|appointment|schedule|date|time|confirm/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'Booking/appointment scheduling flow',
      suggestedEmailType: 'appointment_confirmation',
      suggestedEmailName: 'Appointment Confirmation',
      confidence: 0.88,
      reasoning: 'Detected booking and scheduling patterns',
      suggestedVariables: ['user_name', 'appointment_date', 'appointment_time', 'location']
    };
  }
  // Invoice/Billing patterns
  else if (name.match(/invoice|bill|receipt|payment/i) ||
           allText.match(/invoice|bill|amount|due|payment/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'Invoice/billing screen',
      suggestedEmailType: 'invoice',
      suggestedEmailName: 'Invoice Email',
      confidence: 0.85,
      reasoning: 'Detected billing and invoice patterns',
      suggestedVariables: ['customer_name', 'invoice_number', 'amount', 'due_date']
    };
  }
  // Subscription patterns
  else if (name.match(/subscri|plan|pricing|upgrade|premium/i) ||
           allText.match(/subscri|plan|monthly|yearly|upgrade/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'Subscription/pricing flow',
      suggestedEmailType: 'subscription_renewal',
      suggestedEmailName: 'Subscription Email',
      confidence: 0.82,
      reasoning: 'Detected subscription and pricing patterns',
      suggestedVariables: ['user_name', 'plan_name', 'renewal_date', 'amount']
    };
  }
  // Feedback/Review patterns
  else if (name.match(/feedback|review|rating|survey/i) ||
           allText.match(/feedback|review|rate|how.?was|experience/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'Feedback/review collection screen',
      suggestedEmailType: 'feedback_request',
      suggestedEmailName: 'Feedback Request',
      confidence: 0.8,
      reasoning: 'Detected feedback and review patterns',
      suggestedVariables: ['user_name', 'product_name', 'feedback_link']
    };
  }
  // Email verification patterns
  else if (name.match(/verify|confirm.?email|validate/i) ||
           allText.match(/verify|confirm|code|otp/i)) {
    analysis = {
      ...analysis,
      detectedPurpose: 'Email verification flow',
      suggestedEmailType: 'email_verification',
      suggestedEmailName: 'Email Verification',
      confidence: 0.88,
      reasoning: 'Detected verification patterns',
      suggestedVariables: ['user_name', 'verification_link', 'verification_code']
    };
  }

  return analysis;
}

function refreshOpportunities() {
  // Request new scan from plugin code
  parent.postMessage({
    pluginMessage: {
      type: 'detect-opportunities'
    }
  }, '*');
  
  // Show loading state
  const container = document.getElementById('opportunities-list');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <div class="empty-state-title">Scanning...</div>
      </div>
    `;
  }
}

// Expose generateEmail to window for dynamically generated HTML onclick handlers
(window as any).generateEmail = generateEmail;

// Initial load
console.log('Email Design Assistant UI loaded');
