# 🚀 Deploying the Backend API

## Option 1: Vercel (Recommended - Easiest)

### Prerequisites
- Vercel account (free tier is fine)
- Anthropic API key

### Steps

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel
```

Follow the prompts:
- Link to existing project? **No**
- Project name? **figma-email-api** (or whatever you want)
- Directory? **./api**

4. **Add Environment Variable**
```bash
vercel env add ANTHROPIC_API_KEY
```

Paste your Anthropic API key when prompted.

5. **Redeploy with environment variable**
```bash
vercel --prod
```

6. **Get your API URL**
You'll get a URL like: `https://figma-email-api.vercel.app`

7. **Update Plugin Code**

In `src/ui.ts`, update the `callAIAPI` function:

```typescript
async function callAIAPI(opportunity: any) {
  const response = await fetch('https://YOUR-PROJECT.vercel.app/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      opportunity, 
      brandColors,
      brandVoice: 'professional and friendly' 
    })
  });
  
  if (!response.ok) {
    throw new Error('API request failed');
  }
  
  return await response.json();
}
```

8. **Rebuild Plugin**
```bash
npm run build
```

9. **Reload in Figma**
Plugins → Development → Your Plugin (reload)

---

## Option 2: Cloudflare Workers

### Prerequisites
- Cloudflare account
- Wrangler CLI

### Steps

1. **Install Wrangler**
```bash
npm install -g wrangler
```

2. **Login**
```bash
wrangler login
```

3. **Create wrangler.toml**
```toml
name = "figma-email-api"
main = "api/generate.ts"
compatibility_date = "2024-01-01"

[vars]
# Add non-sensitive vars here

[[env.production]]
name = "figma-email-api-prod"
```

4. **Add Secret**
```bash
wrangler secret put ANTHROPIC_API_KEY
```

5. **Deploy**
```bash
wrangler deploy
```

6. **Use the Workers URL** in your plugin

---

## Option 3: Local Development

For testing without deploying:

1. **Create a local server**

Create `api/dev-server.js`:
```javascript
const http = require('http');
const { handler } = require('./generate');

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const request = new Request('http://localhost:3000', {
          method: 'POST',
          body: body,
          headers: { 'Content-Type': 'application/json' }
        });
        
        const response = await handler(request);
        const data = await response.json();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
});

server.listen(3000, () => {
  console.log('Dev server running on http://localhost:3000');
});
```

2. **Set environment variable**
```bash
export ANTHROPIC_API_KEY=your_key_here
```

3. **Run server**
```bash
node api/dev-server.js
```

4. **Update plugin to use localhost**
```typescript
const response = await fetch('http://localhost:3000', {
  method: 'POST',
  // ... rest of the code
});
```

---

## Getting an Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up / Log in
3. Go to API Keys
4. Create new key
5. Copy the key (starts with `sk-ant-`)
6. Store it securely!

**Cost**: Claude API is pay-as-you-go
- ~$0.003 per email generation
- $5 credit should cover ~1,600 email generations

---

## Testing the API

### Using curl:
```bash
curl -X POST https://your-api.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "opportunity": {
      "type": "welcome_email",
      "context": {
        "userAction": "signed_up",
        "detectedVariables": ["user_name", "verify_link"]
      }
    },
    "brandColors": {
      "primary": "#0066FF",
      "text": "#212529"
    },
    "brandVoice": "friendly and professional"
  }'
```

Expected response:
```json
{
  "subject": "Welcome to [Product]! 🎉",
  "body": "Hi {{user_name}},\n\nWelcome aboard!..."
}
```

---

## Security Notes

- ✅ Never commit API keys to git
- ✅ Use environment variables
- ✅ Enable CORS only for trusted domains in production
- ✅ Add rate limiting if you go public
- ✅ Monitor API usage in Anthropic console

---

## Troubleshooting

### Error: "Failed to generate email"
- Check your API key is set correctly
- Check Vercel logs: `vercel logs`
- Verify the API endpoint URL

### CORS errors
- Make sure CORS headers are set in the API
- Check the request is going to the right URL

### API key not working
- Regenerate in Anthropic console
- Make sure it starts with `sk-ant-`
- Redeploy after updating env var

---

**Ready to deploy? Start with Vercel - it's the easiest! 🚀**
