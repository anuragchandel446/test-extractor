# Translation Feature - Free Solution

## Problem
LibreTranslate instances have CORS restrictions that prevent direct browser access.

## Solution
Switched to **MyMemory Translation API** which is:
- ✅ **Free** - No API key required
- ✅ **CORS Enabled** - Works directly from browser
- ✅ **Reliable** - Backed by translated.net
- ✅ **No Rate Limits** for reasonable use

## API Details

**Endpoint:** `https://api.mymemory.translated.net/get`

**Method:** GET

**Parameters:**
- `q` - Text to translate (URL encoded)
- `langpair` - Language pair in format `source|target` (e.g., `en|es`)

**Example:**
```
https://api.mymemory.translated.net/get?q=Hello&langpair=en|es
```

**Response Format:**
```json
{
  "responseData": {
    "translatedText": "Hola",
    "match": 1
  },
  "responseStatus": 200
}
```

## Supported Languages

MyMemory supports all major languages including:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Portuguese (pt)
- Italian (it)
- Russian (ru)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)
- Hindi (hi)

## Usage Limits

- **Free tier:** 1000 words/day per IP
- **No registration required**
- For higher limits, you can register for a free API key

## Testing

1. Open `test-translation.html` in your browser
2. Click "Test Translation" button
3. Should see successful translation without CORS errors

## Alternative Free Options

If MyMemory doesn't work for you, here are other free alternatives:

1. **Google Translate (unofficial)** - Via googletrans API
2. **DeepL Free API** - Requires API key but has free tier
3. **Microsoft Translator** - Free tier with API key
4. **Yandex Translate** - Free with API key

## Implementation Notes

The code now supports multiple translation providers. To switch providers, update the `TRANSLATION_CONFIG` in `kc.js`:

```javascript
const TRANSLATION_CONFIG = {
    translationService: {
        endpoint: 'https://api.mymemory.translated.net/get',
        provider: 'mymemory', // Change this to switch providers
        timeout: 30000
    }
};
```
