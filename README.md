# Email Design Assistant - Figma Plugin

AI-powered email design suggestions for your Figma workflows. Automatically detects email opportunities in your designs and generates on-brand, AI-written email templates.

## 🚀 Features

- **Smart Detection**: Automatically scans your Figma designs for email opportunities (signup flows, checkout screens, password resets, etc.)
- **AI Copy Generation**: Generates professional email copy using Claude AI
- **Brand-Aware**: Extracts your brand colors from Figma styles
- **One-Click Insert**: Creates beautifully designed email frames directly in Figma
- **Template Library**: Pre-built templates for common email types

## 📋 Prerequisites

- Node.js 18+ installed
- Figma desktop app installed
- Basic knowledge of TypeScript (helpful but not required)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
cd figma-email-plugin
npm install
```

### 2. Build the Plugin

```bash
npm run build
```

This will:
- Compile TypeScript to JavaScript
- Bundle the code with Webpack
- Output files to `dist/` folder

### 3. Load in Figma

1. Open Figma desktop app
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Select the `manifest.json` file from this directory
4. The plugin will now appear in your Plugins menu

### 4. Development Mode (Auto-rebuild)

For active development with auto-rebuild on file changes:

```bash
npm run dev
```

This starts a watch mode that rebuilds on any code changes.

## 📁 Project Structure

```
figma-email-plugin/
├── src/
│   ├── code.ts          # Main plugin code (Figma API)
│   ├── ui.ts            # UI logic (browser APIs)
│   └── ui.html          # Plugin interface
├── dist/                # Built files (generated)
├── manifest.json        # Figma plugin manifest
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── webpack.config.js    # Build config
```

## 🎯 How It Works

### 1. Pattern Detection
The plugin scans your Figma file for frames/components with names like:
- "Signup", "Register" → Suggests welcome email
- "Checkout", "Place Order" → Suggests order confirmation
- "Forgot Password" → Suggests password reset email
- And more...

### 2. AI Copy Generation
When you click "Generate Email", it:
- Analyzes the context (user action, product type)
- Calls an AI API (Claude) to generate copy
- Creates subject line and body text
- Suggests relevant variables

### 3. Figma Frame Creation
When you click "Insert into Figma", it:
- Creates a new email frame (600x800)
- Applies your brand colors (extracted from Figma styles)
- Adds the AI-generated copy
- Structures it with proper hierarchy

## 🔧 Customization

### Adding New Email Types

Edit `src/code.ts` and add detection patterns:

```typescript
function isYourNewFlow(name: string): boolean {
  const patterns = ['your', 'pattern', 'keywords'];
  return patterns.some(p => name.includes(p));
}
```

### Connecting Real AI API

Currently uses mock data. To connect real AI:

1. Create a backend API (Vercel, Cloudflare Workers, etc.)
2. Update `src/ui.ts` in the `callAIAPI` function:

```typescript
async function callAIAPI(opportunity: any) {
  const response = await fetch('https://your-api.com/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      opportunity, 
      brandColors 
    })
  });
  
  return await response.json();
}
```

### Styling the UI

Edit `src/ui.html` - the CSS uses Figma's design tokens for automatic dark/light mode support.

## 🐛 Development Tips

### Debugging
- Use `console.log()` in `code.ts` → View in Figma's DevTools
- Use `console.log()` in `ui.ts` → View in plugin's iframe DevTools
- Right-click plugin → "Show/Hide Console"

### Testing
1. Create test frames in Figma with names like "Signup Flow", "Checkout"
2. Open the plugin
3. Check if opportunities are detected
4. Generate email and verify output

### Hot Reload
With `npm run dev` running:
1. Make changes to source files
2. Wait for rebuild (watch terminal)
3. In Figma: Plugins → Development → Your Plugin (it auto-reloads)

## 📝 Next Steps

### Phase 1: MVP (Current)
- ✅ Pattern detection
- ✅ Mock AI generation
- ✅ Frame creation
- ⬜ Connect real AI API
- ⬜ Add more templates
- ⬜ Improve brand color extraction

### Phase 2: Enhanced Features
- ⬜ Code export (HTML + integration snippets)
- ⬜ Template library
- ⬜ Variable suggestions
- ⬜ A/B testing variants
- ⬜ Version history

### Phase 3: Platform
- ⬜ Web dashboard
- ⬜ Team collaboration
- ⬜ Analytics
- ⬜ Delivery integrations

## 🤝 Contributing

This is a personal project, but suggestions welcome!

## 📄 License

MIT

## 🆘 Troubleshooting

### Plugin won't load
- Check that you ran `npm run build`
- Verify `dist/` folder has `code.js` and `ui.html`
- Try removing and re-importing the plugin

### TypeScript errors
- Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` for configuration issues

### Build errors
- Delete `node_modules/` and `dist/`
- Run `npm install` again
- Run `npm run build`

### No opportunities detected
- Check that your Figma frames have descriptive names
- Try naming a frame "Signup Flow" or "Checkout" explicitly
- Open DevTools and check for console errors

## 📧 Contact

Built by [Your Name]
- Twitter: [@yourhandle]
- Email: your@email.com

---

**Happy designing! 🎨📧**
