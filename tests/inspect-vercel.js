const fs = require('fs');
const content = fs.readFileSync('C:/Users/lenovo/.gemini/antigravity-ide/brain/d85392d4-8536-4d25-ac44-f51392e58b75/.system_generated/steps/684/content.md', 'utf8');

const urls = content.match(/https?:\/\/[a-zA-Z0-9.-]+\.vercel\.app[^\s\"\'<>)]*/g) || [];
const uniqueUrls = [...new Set(urls)];
console.log('Found Vercel URLs:', uniqueUrls);
