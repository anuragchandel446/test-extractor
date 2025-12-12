# Translation Feature Design Document

## Overview

This design addresses the CORS issue preventing the translation feature from working when accessing external translation APIs. The solution implements a CORS proxy approach using a public CORS proxy service, with fallback mechanisms and configurable endpoints.

The current implementation attempts to directly call `https://libretranslate.de/translate` from the browser, which fails due to CORS restrictions. The design provides multiple solutions:

1. **Primary Solution**: Use a CORS proxy service to wrap API requests
2. **Alternative Solution**: Provide configuration for users to specify their own CORS-enabled translation endpoint
3. **Fallback Mechanism**: Graceful error handling with clear user feedback

## Architecture

### High-Level Architecture

The translation feature uses a layered architecture with a CORS proxy layer between the browser client and the translation service.

**Flow:**
- Browser UI (kc.html/js)
- Translation Client (text extraction, endpoint config, error handling)
- CORS Proxy Layer (corsproxy.io or custom proxy)
- Translation Service (LibreTranslate or alternative API)

### Component Interaction Flow

1. User clicks translate button
2. Translation Client extracts text (selection or full content)
3. Translation Client constructs proxied URL
4. Fetch request sent through CORS proxy
5. CORS proxy forwards request to Translation Service
6. Translation Service returns translated text
7. CORS proxy returns response to client
8. Translation Client updates UI with result

## Components and Interfaces

### Translation Client Component

**Responsibilities:**
- Extract text from text area (selection or full content)
- Manage translation endpoint configuration
- Handle CORS proxy wrapping
- Update UI status indicators
- Persist user preferences
- Handle errors gracefully

**Key Functions:**

```javascript
// Main translation function
async function translateText(text, targetLang, options = {})
  Input: text (string), targetLang (string), options (object)
  Output: Promise<string> (translated text)
```

```javascript
// Get effective translation endpoint (with proxy if needed)
function getTranslationEndpoint()
  Input: none
  Output: string (full URL with proxy wrapper)
```

```javascript
// Extract text based on selection state
function getTextToTranslate()
  Input: none
  Output: string (text to translate)
```

```javascript
// Update UI with translation result
function applyTranslation(translatedText, replaceMode)
  Input: translatedText (string), replaceMode (boolean)
  Output: void
```

### Configuration Manager

**Responsibilities:**
- Load translation service configuration
- Manage CORS proxy settings
- Provide defaults when no config exists

**Configuration Structure:**

```javascript
{
  translationService: {
    endpoint: 'https://libretranslate.de/translate',
    useCorsProxy: true,
    corsProxyUrl: 'https://corsproxy.io/?',
    timeout: 30000
  },
  preferences: {
    targetLanguage: 'es',
    replaceMode: false,
    autoSpeak: false
  }
}
```

### Error Handler Component

**Responsibilities:**
- Catch and classify errors (CORS, network, API errors)
- Provide user-friendly error messages
- Log errors for debugging
- Attempt fallback strategies

## Data Models

### Translation Request

```javascript
{
  q: string,           // Text to translate
  source: string,      // Source language code ('auto' for detection)
  target: string,      // Target language code
  format: string       // 'text' or 'html'
}
```

### Translation Response

```javascript
{
  translatedText: string,  // Translated result
  detectedLanguage?: {     // Optional detected source language
    language: string,
    confidence: number
  }
}
```

### Error Response

```javascript
{
  error: string,       // Error message
  code: string,        // Error code (CORS_ERROR, NETWORK_ERROR, API_ERROR)
  details?: any        // Additional error details
}
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Translation request completeness
*For any* non-empty text and valid target language, calling translateText should return a non-empty translated result or throw an error
**Validates: Requirements 1.1**

### Property 2: Selection-based translation isolation
*For any* text with a valid selection range, the translation function should only process the selected portion and not the entire text
**Validates: Requirements 1.2**

### Property 3: Full text translation when no selection
*For any* text area content when no selection exists (selectionStart equals selectionEnd), the translation function should process the entire text content
**Validates: Requirements 1.3**

### Property 4: Status indicator during translation
*For any* translation operation in progress, the status element should display "translating..." until completion
**Validates: Requirements 1.4**

### Property 5: Status reset after successful translation
*For any* successfully completed translation, the status element should be updated to "idle"
**Validates: Requirements 1.5**

### Property 6: CORS proxy URL construction
*For any* translation request when useCorsProxy is enabled, the constructed URL should include the CORS proxy prefix before the translation service endpoint
**Validates: Requirements 2.1**

### Property 7: Error status on translation failure
*For any* failed translation attempt, the status should be updated to "translate failed" and the error should be logged to the console
**Validates: Requirements 2.4**

### Property 8: Replace mode text substitution
*For any* translated text when replace mode is enabled, the original text should be completely replaced with the translated text
**Validates: Requirements 3.1**

### Property 9: Append mode text preservation
*For any* translated text when replace mode is disabled, both the original text and translated text should be present in the text area
**Validates: Requirements 3.2**

### Property 10: Partial replacement with selection
*For any* selected text portion when translated with replace mode enabled, only the selected portion should be replaced while surrounding text remains unchanged
**Validates: Requirements 3.3**

### Property 11: Language preference persistence
*For any* target language selection, storing it to localStorage and then retrieving it should return the same language code
**Validates: Requirements 4.1, 4.2**

### Property 12: Custom endpoint override
*For any* custom translation endpoint provided in configuration, the system should use that endpoint instead of the default endpoint
**Validates: Requirements 5.2**

## Error Handling

### Error Classification

The system classifies errors into three categories:

1. **CORS Errors**: Detected when fetch fails with TypeError and message contains "CORS" or "Failed to fetch"
2. **Network Errors**: Connection timeouts, DNS failures, or other network-level issues
3. **API Errors**: HTTP error responses (4xx, 5xx) from the translation service

### Error Handling Strategy

**For CORS Errors:**
- Automatically retry with CORS proxy if not already using one
- Display message: "Translation service blocked by browser security. Using proxy..."

**For Network Errors:**
- Display message: "Network error. Please check your connection."
- Log full error details to console

**For API Errors:**
- Parse error response from translation service
- Display message: "Translation failed: [API error message]"
- Log HTTP status and response body

### Fallback Behavior

If translation fails after all retry attempts:
1. Keep original text unchanged
2. Display clear error message in status area
3. Re-enable translate button for user to retry manually
4. Log error details for debugging

## Testing Strategy

### Unit Testing

Unit tests will cover:
- Text extraction logic (selection vs full content)
- URL construction with and without CORS proxy
- Error classification logic
- LocalStorage persistence and retrieval
- UI state updates (status messages, button states)

### Property-Based Testing

We will use **fast-check** (for JavaScript) as the property-based testing library.

Property-based tests will:
- Run a minimum of 100 iterations per property
- Generate random text inputs of varying lengths
- Generate random selection ranges
- Test with various target language codes
- Verify properties hold across all generated inputs

Each property-based test will be tagged with a comment referencing the design document property:
```javascript
// Feature: translation-feature, Property 1: Translation request completeness
```

### Integration Testing

Integration tests will verify:
- End-to-end translation flow with mock translation service
- CORS proxy integration with actual proxy service
- Error handling with simulated failures
- UI updates in response to translation events

### Test Configuration

- Property tests configured for 100+ iterations
- Timeout set to 30 seconds for network operations
- Mock translation service for predictable test results
- LocalStorage mocked for isolated test environment

## Implementation Notes

### CORS Proxy Selection

The design uses `https://corsproxy.io/?` as the default CORS proxy because:
- It's a public, free service
- Simple URL-based API (just prefix the target URL)
- No authentication required
- Supports POST requests

Alternative proxies can be configured:
- `https://api.allorigins.win/raw?url=`
- `https://cors-anywhere.herokuapp.com/`
- Self-hosted CORS proxy for production use

### Performance Considerations

- Translation requests may take 2-10 seconds depending on text length
- CORS proxy adds minimal latency (typically <200ms)
- Implement request timeout of 30 seconds
- Show progress indicator during translation
- Disable translate button during operation to prevent duplicate requests

### Security Considerations

- CORS proxy sees all translation requests (privacy concern)
- For sensitive content, users should configure self-hosted translation service
- No API keys or credentials stored in client-side code
- All translation data transmitted over HTTPS

### Browser Compatibility

- Requires modern browser with Fetch API support
- LocalStorage for preferences (fallback to defaults if unavailable)
- Tested on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
