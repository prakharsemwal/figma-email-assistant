# 🚀 Quick Start Guide

## Get Running in 5 Minutes

### Step 1: Install Dependencies (2 min)
```bash
cd figma-email-plugin
npm install
```

### Step 2: Build the Plugin (1 min)
```bash
npm run build
```

### Step 3: Load in Figma (1 min)
1. Open Figma desktop app
2. **Plugins** → **Development** → **Import plugin from manifest**
3. Select `manifest.json` from this folder
4. Done! ✅

### Step 4: Test It (1 min)
1. Create a frame in Figma named "Signup Flow" or "Checkout"
2. Open your plugin from the Plugins menu
3. See the detected opportunity
4. Click "Generate Email"
5. Watch the magic happen! ✨

---

## What You'll See

### Main Screen
```
📧 Email Design Assistant
AI-powered email suggestions for your flows

Detected Opportunities
┌─────────────────────────────┐
│ Welcome Email          90%  │
│ 📐 Signup Flow              │
│ Action: signed_up           │
│ [Generate Email]            │
└─────────────────────────────┘
```

### Generator Screen
```
Generate Email Copy

Email Type: Welcome Email

Subject Line:
Welcome to [Product Name]! 🎉

Email Body:
Hi {{user_name}},

Welcome aboard! We're thrilled...

[🔄 Regenerate] [✨ Insert into Figma]
```

---

## Tips for Better Detection

### ✅ Good Frame Names
- "Signup Flow"
- "Checkout Page"
- "Password Reset"
- "Order Confirmation"

### ❌ Bad Frame Names
- "Frame 1"
- "Group 2"
- "Rectangle"

---

## Development Mode

For active development:
```bash
npm run dev
```

This watches for changes and auto-rebuilds.

---

## Next: Connect Real AI

Currently uses mock data. To connect Claude AI:

1. Create backend API (see README)
2. Update `src/ui.ts` → `callAIAPI()` function
3. Add your API endpoint

---

## Having Issues?

### Plugin won't load?
- Check `dist/` folder exists with files
- Try `npm run build` again

### No opportunities detected?
- Name your frames descriptively
- Try "Signup Flow" exactly

### Want to customize?
- See full README.md for details
- All detection patterns in `src/code.ts`
- All UI in `src/ui.html`

---

**You're all set! Start detecting email opportunities! 🎉**
