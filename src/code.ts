// Main plugin code - runs in Figma's main thread
// This code has access to the Figma document but NOT to browser APIs

// Show the plugin UI
figma.showUI(__html__, { 
  width: 400, 
  height: 600,
  themeColors: true 
});

// Types for our email opportunities
interface EmailOpportunity {
  id: string;
  type: EmailType;
  frameName: string;
  frameId: string;
  confidence: number;
  context: {
    productType?: string;
    userAction?: string;
    detectedVariables?: string[];
  };
}

type EmailType = 
  | 'welcome_email'
  | 'order_confirmation'
  | 'shipping_notification'
  | 'password_reset'
  | 'email_verification'
  | 'payment_failed'
  | 'subscription_renewal'
  | 'account_deleted'
  | 'generic_transactional';

// Pattern detection functions
function detectEmailOpportunities(): EmailOpportunity[] {
  const opportunities: EmailOpportunity[] = [];
  const currentPage = figma.currentPage;

  // Scan all nodes in the current page
  const allNodes = currentPage.findAll();

  for (const node of allNodes) {
    // Only look at frames and components
    if (node.type !== 'FRAME' && node.type !== 'COMPONENT') continue;

    const name = node.name.toLowerCase();
    const opportunity = analyzeNode(node, name);
    
    if (opportunity) {
      opportunities.push(opportunity);
    }
  }

  return opportunities;
}

function analyzeNode(node: SceneNode, name: string): EmailOpportunity | null {
  const id = node.id;

  // Welcome/Signup patterns
  if (isSignupFlow(name)) {
    return {
      id: `opp_${id}`,
      type: 'welcome_email',
      frameName: node.name,
      frameId: id,
      confidence: 0.9,
      context: {
        userAction: 'signed_up',
        detectedVariables: ['user_name', 'email', 'verify_link']
      }
    };
  }

  // Order/Checkout patterns
  if (isCheckoutFlow(name)) {
    return {
      id: `opp_${id}`,
      type: 'order_confirmation',
      frameName: node.name,
      frameId: id,
      confidence: 0.95,
      context: {
        productType: 'e-commerce',
        userAction: 'placed_order',
        detectedVariables: ['order_number', 'customer_name', 'total', 'items', 'shipping_address']
      }
    };
  }

  // Password reset patterns
  if (isPasswordResetFlow(name)) {
    return {
      id: `opp_${id}`,
      type: 'password_reset',
      frameName: node.name,
      frameId: id,
      confidence: 0.92,
      context: {
        userAction: 'requested_password_reset',
        detectedVariables: ['user_name', 'reset_link', 'expiry_time']
      }
    };
  }

  // Email verification patterns
  if (isEmailVerificationFlow(name)) {
    return {
      id: `opp_${id}`,
      type: 'email_verification',
      frameName: node.name,
      frameId: id,
      confidence: 0.88,
      context: {
        userAction: 'needs_email_verification',
        detectedVariables: ['user_name', 'verification_link', 'verification_code']
      }
    };
  }

  // Check if node contains buttons that might trigger emails
  if (node.type === 'FRAME') {
    const buttons = findButtonsInFrame(node as FrameNode);
    for (const button of buttons) {
      const buttonText = button.toLowerCase();
      
      if (buttonText.includes('submit') || buttonText.includes('confirm') || buttonText.includes('send')) {
        return {
          id: `opp_${id}`,
          type: 'generic_transactional',
          frameName: node.name,
          frameId: id,
          confidence: 0.7,
          context: {
            userAction: 'submitted_form',
            detectedVariables: []
          }
        };
      }
    }
  }

  return null;
}

// Pattern matching functions
function isSignupFlow(name: string): boolean {
  const patterns = [
    'signup', 'sign up', 'register', 'registration', 
    'create account', 'new account', 'join', 'get started'
  ];
  return patterns.some(p => name.includes(p));
}

function isCheckoutFlow(name: string): boolean {
  const patterns = [
    'checkout', 'place order', 'buy', 'purchase', 
    'payment', 'cart', 'order', 'confirm order'
  ];
  return patterns.some(p => name.includes(p));
}

function isPasswordResetFlow(name: string): boolean {
  const patterns = [
    'forgot password', 'reset password', 'password reset', 'forgot'
  ];
  return patterns.some(p => name.includes(p));
}

function isEmailVerificationFlow(name: string): boolean {
  const patterns = [
    'verify email', 'email verification', 'confirm email', 'verify account'
  ];
  return patterns.some(p => name.includes(p));
}

function findButtonsInFrame(frame: FrameNode): string[] {
  const buttons: string[] = [];
  
  const findButtons = (node: SceneNode) => {
    // Check if it's a button-like component
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const name = node.name.toLowerCase();
      if (name.includes('button') || name.includes('cta') || name.includes('btn')) {
        // Try to find text in the button
        const textNodes = node.findAll(n => n.type === 'TEXT') as TextNode[];
        if (textNodes.length > 0) {
          buttons.push(textNodes[0].characters);
        }
      }
    }
    
    // Check text nodes for button-like content
    if (node.type === 'TEXT') {
      const text = (node as TextNode).characters.toLowerCase();
      if (text.length < 30) { // Likely a button if short
        buttons.push(text);
      }
    }
    
    // Recurse into children
    if ('children' in node) {
      for (const child of node.children) {
        findButtons(child);
      }
    }
  };
  
  findButtons(frame);
  return buttons;
}

// Extract brand colors from Figma styles
function getBrandColors() {
  const paintStyles = figma.getLocalPaintStyles();
  const colors: { [key: string]: string } = {};
  
  for (const style of paintStyles) {
    const name = style.name.toLowerCase();
    const paint = style.paints[0];
    
    if (paint && paint.type === 'SOLID') {
      const rgb = paint.color;
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      
      if (name.includes('primary')) colors.primary = hex;
      if (name.includes('secondary')) colors.secondary = hex;
      if (name.includes('text') || name.includes('foreground')) colors.text = hex;
      if (name.includes('background')) colors.background = hex;
    }
  }
  
  // Defaults if no styles found
  return {
    primary: colors.primary || '#0066FF',
    secondary: colors.secondary || '#6C757D',
    text: colors.text || '#212529',
    background: colors.background || '#FFFFFF',
    ...colors
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Create email frame in Figma
async function createEmailFrame(emailData: {
  type: EmailType;
  subject: string;
  body: string;
  brandColors: any;
}) {
  const frame = figma.createFrame();
  frame.name = `Email - ${formatEmailType(emailData.type)}`;
  frame.resize(600, 800);
  frame.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }];
  
  // Create email container
  const emailContainer = figma.createFrame();
  emailContainer.name = 'Email Content';
  emailContainer.resize(560, 760);
  emailContainer.x = 20;
  emailContainer.y = 20;
  emailContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  emailContainer.cornerRadius = 8;
  emailContainer.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 8,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Add header
  const header = await createHeader(emailData.brandColors);
  header.x = 40;
  header.y = 40;
  emailContainer.appendChild(header);
  
  // Add subject line (as annotation)
  const subjectText = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  subjectText.characters = `Subject: ${emailData.subject}`;
  subjectText.fontSize = 14;
  subjectText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  subjectText.x = 40;
  subjectText.y = 120;
  emailContainer.appendChild(subjectText);
  
  // Add body content
  const bodyText = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  bodyText.characters = emailData.body;
  bodyText.fontSize = 16;
  bodyText.lineHeight = { value: 150, unit: 'PERCENT' };
  bodyText.fills = [{ type: 'SOLID', color: hexToRgb(emailData.brandColors.text) }];
  bodyText.resize(480, 500);
  bodyText.x = 40;
  bodyText.y = 160;
  emailContainer.appendChild(bodyText);
  
  frame.appendChild(emailContainer);
  
  // Center in viewport
  figma.viewport.scrollAndZoomIntoView([frame]);
  
  return frame;
}

async function createHeader(brandColors: any) {
  const header = figma.createFrame();
  header.name = 'Header';
  header.resize(480, 60);
  header.fills = [];
  
  // Logo placeholder
  const logoPlaceholder = figma.createRectangle();
  logoPlaceholder.name = 'Logo';
  logoPlaceholder.resize(120, 40);
  logoPlaceholder.fills = [{ type: 'SOLID', color: hexToRgb(brandColors.primary) }];
  logoPlaceholder.cornerRadius = 4;
  header.appendChild(logoPlaceholder);
  
  return header;
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

function formatEmailType(type: EmailType): string {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Message handling from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'detect-opportunities') {
    const opportunities = detectEmailOpportunities();
    const brandColors = getBrandColors();
    
    figma.ui.postMessage({
      type: 'opportunities-detected',
      opportunities,
      brandColors
    });
  }
  
  if (msg.type === 'create-email') {
    const { emailType, subject, body } = msg;
    const brandColors = getBrandColors();
    
    await createEmailFrame({
      type: emailType,
      subject,
      body,
      brandColors
    });
    
    figma.notify('✅ Email template created!');
  }
  
  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// Initial scan when plugin opens
setTimeout(() => {
  const opportunities = detectEmailOpportunities();
  const brandColors = getBrandColors();
  
  figma.ui.postMessage({
    type: 'opportunities-detected',
    opportunities,
    brandColors
  });
}, 100);
