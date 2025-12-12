# 🚀 Moon Stoners TTS Reader - Complete API List

## 🌐 **External APIs & Services**

### 1. **MyMemory Translation API**
- **URL**: `https://api.mymemory.translated.net/get`
- **Type**: REST API (GET requests)
- **Purpose**: Text translation between languages
- **Cost**: Free (1000 words/day per IP)
- **Authentication**: None required
- **CORS**: Enabled
- **Usage**: Primary translation service

### 2. **Google Fonts API**
- **URL**: `https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap`
- **Type**: CSS Font Service
- **Purpose**: Load Poppins font family
- **Cost**: Free
- **Usage**: Typography enhancement

### 3. **Tesseract.js CDN**
- **URL**: `https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js`
- **Type**: JavaScript Library CDN
- **Purpose**: Optical Character Recognition (OCR)
- **Cost**: Free
- **Usage**: Extract text from images

## 🖥️ **Browser Web APIs**

### 1. **Web Speech API**
- **Components**:
  - `speechSynthesis` - Text-to-Speech
  - `SpeechSynthesisUtterance` - Speech configuration
  - `SpeechRecognition` / `webkitSpeechRecognition` - Speech-to-Text
- **Purpose**: Voice synthesis and recognition
- **Browser Support**: Chrome, Safari, Edge (limited Firefox)
- **Usage**: Core TTS and voice input functionality

### 2. **File API**
- **Components**:
  - `FileReader` - Read uploaded files
  - `File` interface - Handle file objects
- **Purpose**: Read text files and images
- **Usage**: File upload functionality

### 3. **Fetch API**
- **Purpose**: HTTP requests to translation service
- **Usage**: API calls to MyMemory Translation API
- **Features**: Promise-based, modern replacement for XMLHttpRequest

### 4. **Web Storage API**
- **Components**:
  - `localStorage` - Persistent local storage
- **Purpose**: Save user preferences and settings
- **Usage**: Store voice settings, language preferences, UI state

### 5. **Canvas API** (via Tesseract.js)
- **Purpose**: Image processing for OCR
- **Usage**: Process uploaded images for text extraction

### 6. **Media Capture API**
- **Components**:
  - Camera capture via file input with `capture="environment"`
- **Purpose**: Take photos for OCR processing
- **Usage**: Camera button functionality

### 7. **Drag and Drop API**
- **Events**: `dragenter`, `dragover`, `dragleave`, `drop`
- **Purpose**: Drag and drop image files
- **Usage**: Image drop zone functionality

### 8. **URL API**
- **Components**:
  - `URL.createObjectURL()` - Create blob URLs
  - `URL.revokeObjectURL()` - Clean up blob URLs
- **Purpose**: Handle image preview
- **Usage**: Display uploaded images

## 🎨 **CSS APIs**

### 1. **CSS Custom Properties (Variables)**
- **Purpose**: Dynamic theming and color management
- **Usage**: Cosmic color scheme and responsive design

### 2. **CSS Grid & Flexbox**
- **Purpose**: Advanced layout management
- **Usage**: Split-screen responsive layout

### 3. **CSS Backdrop Filter**
- **Purpose**: Glass morphism effects
- **Usage**: Transparent panel backgrounds

### 4. **CSS Animations & Transitions**
- **Purpose**: Smooth interactions and cosmic effects
- **Usage**: Button hover effects, background animations

## 🔧 **JavaScript Built-in APIs**

### 1. **DOM API**
- **Components**: Document manipulation, event handling
- **Usage**: UI interactions and dynamic content

### 2. **Timer APIs**
- **Components**: `setTimeout`, `clearTimeout`, `requestAnimationFrame`
- **Usage**: Speech timing, animations, background effects

### 3. **Console API**
- **Purpose**: Error logging and debugging
- **Usage**: Development and error tracking

### 4. **Navigator API**
- **Components**: `navigator.language` - Detect user language
- **Usage**: Default language selection

## 📊 **API Usage Summary**

| Category | Count | Examples |
|----------|-------|----------|
| **External APIs** | 3 | MyMemory, Google Fonts, Tesseract CDN |
| **Browser Web APIs** | 8 | Speech API, File API, Fetch API |
| **CSS APIs** | 4 | Custom Properties, Grid, Backdrop Filter |
| **JavaScript APIs** | 4 | DOM, Timers, Console, Navigator |

## 🔒 **Security & Privacy**

- **No API Keys Required**: All external services are free and public
- **CORS Compliant**: All external APIs support cross-origin requests
- **Local Storage Only**: No data sent to external servers except for translation
- **Privacy Friendly**: Translation data is processed by MyMemory but not stored

## 🌟 **Key Features Enabled**

- ✅ **Text-to-Speech** - Web Speech API
- ✅ **Speech-to-Text** - Web Speech Recognition API  
- ✅ **Translation** - MyMemory Translation API
- ✅ **OCR** - Tesseract.js
- ✅ **File Upload** - File API
- ✅ **Camera Capture** - Media Capture API
- ✅ **Drag & Drop** - Drag and Drop API
- ✅ **Persistent Settings** - Web Storage API
- ✅ **Cosmic UI** - CSS APIs

All APIs are modern, well-supported, and provide a rich user experience! 🚀✨