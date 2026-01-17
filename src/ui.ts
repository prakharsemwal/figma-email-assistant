// UI code - runs in iframe with access to browser APIs but NOT Figma document

let opportunities: any[] = [];
let brandColors: any = {};
let currentOpportunity: any = null;

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
        <div class="opportunity-type">${_formatEmailType(opp.type)}</div>
        <div class="confidence-badge">${Math.round(opp.confidence * 100)}%</div>
      </div>
      <div class="opportunity-frame">📐 ${opp.frameName}</div>
      <div class="opportunity-context">
        ${opp.context.userAction ? `Action: ${opp.context.userAction}` : ''}
      </div>
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
