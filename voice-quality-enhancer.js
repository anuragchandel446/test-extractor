// Voice Quality Enhancement System
// Improves TTS clarity, voice selection, and speech parameters

class VoiceQualityAnalyzer {
    constructor() {
        this.voiceCache = new Map();
        this.qualityMetrics = new Map();
    }

    // Analyze voice quality based on multiple factors
    analyzeVoice(voice) {
        if (this.voiceCache.has(voice.voiceURI || voice.name)) {
            return this.voiceCache.get(voice.voiceURI || voice.name);
        }

        const metrics = this.calculateQualityMetrics(voice);
        const score = this.calculateOverallScore(metrics);
        
        const analysis = {
            voiceURI: voice.voiceURI || voice.name,
            name: voice.name,
            lang: voice.lang,
            qualityScore: score,
            ...metrics,
            isRecommended: score >= 75,
            characteristics: this.analyzeCharacteristics(voice)
        };

        this.voiceCache.set(voice.voiceURI || voice.name, analysis);
        return analysis;
    }

    calculateQualityMetrics(voice) {
        let clarity = 50;
        let naturalness = 50;
        let pronunciation = 50;

        // Analyze voice name for quality indicators
        const name = voice.name.toLowerCase();
        
        // Premium/High-quality voice indicators
        if (name.includes('premium') || name.includes('enhanced') || name.includes('neural')) {
            clarity += 30;
            naturalness += 25;
            pronunciation += 20;
        }

        // Platform-specific quality indicators
        if (name.includes('siri') || name.includes('cortana') || name.includes('google')) {
            clarity += 25;
            naturalness += 20;
            pronunciation += 25;
        }

        // Language-specific adjustments
        if (voice.lang && voice.lang.startsWith('en')) {
            // English voices tend to be higher quality
            clarity += 10;
            pronunciation += 15;
        }

        // Voice type indicators
        if (name.includes('compact') || name.includes('basic')) {
            clarity -= 20;
            naturalness -= 15;
        }

        // Ensure scores are within bounds
        clarity = Math.max(0, Math.min(100, clarity));
        naturalness = Math.max(0, Math.min(100, naturalness));
        pronunciation = Math.max(0, Math.min(100, pronunciation));

        return { clarity, naturalness, pronunciation };
    }

    calculateOverallScore(metrics) {
        // Weighted average with emphasis on clarity
        return Math.round(
            (metrics.clarity * 0.4) + 
            (metrics.naturalness * 0.35) + 
            (metrics.pronunciation * 0.25)
        );
    }

    analyzeCharacteristics(voice) {
        const name = voice.name.toLowerCase();
        
        return {
            gender: this.detectGender(name),
            accent: this.detectAccent(voice.lang, name),
            speed: this.detectSpeed(name),
            tone: this.detectTone(name)
        };
    }

    detectGender(name) {
        const femaleIndicators = ['female', 'woman', 'lady', 'girl', 'samantha', 'susan', 'victoria', 'karen', 'zira'];
        const maleIndicators = ['male', 'man', 'guy', 'david', 'mark', 'daniel', 'alex', 'tom'];
        
        for (const indicator of femaleIndicators) {
            if (name.includes(indicator)) return 'female';
        }
        
        for (const indicator of maleIndicators) {
            if (name.includes(indicator)) return 'male';
        }
        
        return 'neutral';
    }

    detectAccent(lang, name) {
        if (!lang) return 'unknown';
        
        const langCode = lang.split('-')[0];
        const region = lang.split('-')[1];
        
        if (langCode === 'en') {
            if (region === 'US' || name.includes('us')) return 'American';
            if (region === 'GB' || name.includes('uk') || name.includes('british')) return 'British';
            if (region === 'AU' || name.includes('australian')) return 'Australian';
            return 'English';
        }
        
        return langCode;
    }

    detectSpeed(name) {
        if (name.includes('fast') || name.includes('quick')) return 'fast';
        if (name.includes('slow') || name.includes('careful')) return 'slow';
        return 'normal';
    }

    detectTone(name) {
        if (name.includes('robotic') || name.includes('synthetic')) return 'robotic';
        if (name.includes('formal') || name.includes('business')) return 'formal';
        return 'casual';
    }

    // Rank voices by quality
    rankVoices(voices) {
        const analyzed = voices.map(voice => this.analyzeVoice(voice));
        return analyzed.sort((a, b) => b.qualityScore - a.qualityScore);
    }

    // Get best voice for preferences
    getBestVoice(voices, preferences = {}) {
        const ranked = this.rankVoices(voices);
        
        if (!preferences.gender) {
            return ranked[0];
        }

        // Find best voice matching gender preference
        const genderMatches = ranked.filter(voice => 
            voice.characteristics.gender === preferences.gender
        );

        if (genderMatches.length > 0) {
            return genderMatches[0];
        }

        // Fallback to best overall if no gender match
        return ranked[0];
    }
}

class SpeechParameterOptimizer {
    constructor() {
        this.defaultParams = {
            rate: 1.0,
            pitch: 1.0,
            volume: 0.9,
            pauseDuration: 200
        };
    }

    // Optimize parameters for maximum clarity
    optimizeForClarity(params, voice = null) {
        const optimized = { ...params };

        // Rate optimization for clarity
        if (optimized.rate > 1.5) {
            // Slow down very fast speech for clarity
            optimized.rate = Math.min(optimized.rate, 1.4);
            // Increase volume slightly for fast speech
            optimized.volume = Math.min(1.0, optimized.volume + 0.1);
        }

        if (optimized.rate < 0.7) {
            // Speed up very slow speech
            optimized.rate = Math.max(optimized.rate, 0.8);
        }

        // Pitch optimization
        if (optimized.pitch > 1.5 || optimized.pitch < 0.7) {
            // Keep pitch in natural range
            optimized.pitch = Math.max(0.8, Math.min(1.3, optimized.pitch));
        }

        // Volume optimization
        if (optimized.volume < 0.3) {
            optimized.volume = 0.5; // Ensure audible volume
        }

        // Voice-specific optimizations
        if (voice) {
            optimized = this.adjustForVoice(optimized, voice);
        }

        return this.validateParameters(optimized);
    }

    adjustForVoice(params, voiceAnalysis) {
        const adjusted = { ...params };

        // Adjust for voice quality
        if (voiceAnalysis.qualityScore < 60) {
            // Lower quality voices need slower speech
            adjusted.rate = Math.min(adjusted.rate, 1.2);
            adjusted.volume = Math.min(1.0, adjusted.volume + 0.1);
        }

        // Adjust for voice characteristics
        if (voiceAnalysis.characteristics.speed === 'fast') {
            adjusted.rate = Math.max(0.9, adjusted.rate - 0.1);
        }

        if (voiceAnalysis.characteristics.tone === 'robotic') {
            // Make robotic voices more natural
            adjusted.pitch = Math.max(0.9, Math.min(1.1, adjusted.pitch));
            adjusted.rate = Math.max(0.9, adjusted.rate - 0.1);
        }

        return adjusted;
    }

    validateParameters(params) {
        return {
            rate: Math.max(0.5, Math.min(2.0, params.rate || 1.0)),
            pitch: Math.max(0.0, Math.min(2.0, params.pitch || 1.0)),
            volume: Math.max(0.0, Math.min(1.0, params.volume || 0.9)),
            pauseDuration: Math.max(0, Math.min(2000, params.pauseDuration || 200))
        };
    }

    getRecommendations(voiceAnalysis) {
        const recommendations = [];

        if (voiceAnalysis.qualityScore < 70) {
            recommendations.push({
                type: 'voice',
                message: 'Consider selecting a higher quality voice for better clarity',
                action: 'selectBetterVoice'
            });
        }

        if (voiceAnalysis.clarity < 60) {
            recommendations.push({
                type: 'rate',
                message: 'Try reducing speech speed for better clarity',
                action: 'reduceRate'
            });
        }

        return recommendations;
    }
}

class TextPreprocessor {
    constructor() {
        this.abbreviations = {
            'dr': 'doctor',
            'mr': 'mister',
            'mrs': 'missus',
            'ms': 'miss',
            'prof': 'professor',
            'st': 'street',
            'ave': 'avenue',
            'blvd': 'boulevard',
            'etc': 'etcetera',
            'vs': 'versus',
            'eg': 'for example',
            'ie': 'that is',
            'usa': 'United States of America',
            'uk': 'United Kingdom',
            'ai': 'artificial intelligence',
            'api': 'application programming interface',
            'url': 'web address',
            'html': 'hypertext markup language',
            'css': 'cascading style sheets',
            'js': 'javascript'
        };

        this.numberWords = {
            0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four',
            5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
            10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen',
            14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen',
            18: 'eighteen', 19: 'nineteen', 20: 'twenty', 30: 'thirty',
            40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy',
            80: 'eighty', 90: 'ninety', 100: 'hundred', 1000: 'thousand'
        };
    }

    preprocessText(text) {
        if (!text || typeof text !== 'string') return text;

        let processed = text;

        // Normalize whitespace
        processed = processed.replace(/\s+/g, ' ').trim();

        // Expand abbreviations
        processed = this.expandAbbreviations(processed);

        // Handle numbers
        processed = this.normalizeNumbers(processed);

        // Handle special characters
        processed = this.handleSpecialChars(processed);

        // Handle URLs and emails
        processed = this.handleUrlsAndEmails(processed);

        // Add proper pauses
        processed = this.addPauses(processed);

        return processed;
    }

    expandAbbreviations(text) {
        let processed = text;

        // Expand common abbreviations
        for (const [abbr, expansion] of Object.entries(this.abbreviations)) {
            const regex = new RegExp(`\\b${abbr}\\.?\\b`, 'gi');
            processed = processed.replace(regex, expansion);
        }

        return processed;
    }

    normalizeNumbers(text) {
        // Convert simple numbers to words for better pronunciation
        return text.replace(/\b(\d{1,2})\b/g, (match, num) => {
            const number = parseInt(num);
            return this.numberWords[number] || match;
        });
    }

    handleSpecialChars(text) {
        return text
            .replace(/&/g, ' and ')
            .replace(/@/g, ' at ')
            .replace(/#/g, ' hashtag ')
            .replace(/\$/g, ' dollar ')
            .replace(/%/g, ' percent ')
            .replace(/\+/g, ' plus ')
            .replace(/=/g, ' equals ')
            .replace(/</g, ' less than ')
            .replace(/>/g, ' greater than ')
            .replace(/\*/g, ' star ')
            .replace(/\|/g, ' pipe ')
            .replace(/\\/g, ' backslash ')
            .replace(/\//g, ' slash ');
    }

    handleUrlsAndEmails(text) {
        // Handle URLs
        text = text.replace(/https?:\/\/[^\s]+/g, 'web link');
        
        // Handle emails
        text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email address');
        
        return text;
    }

    addPauses(text) {
        // Add longer pauses after sentences
        text = text.replace(/([.!?])\s+/g, '$1 ... ');
        
        // Add shorter pauses after commas
        text = text.replace(/,\s+/g, ', .. ');
        
        return text;
    }

    detectLanguage(text) {
        // Simple language detection based on common words
        const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const spanishWords = ['el', 'la', 'y', 'o', 'pero', 'en', 'con', 'de', 'para', 'por'];
        const frenchWords = ['le', 'la', 'et', 'ou', 'mais', 'dans', 'sur', 'avec', 'de', 'pour'];

        const words = text.toLowerCase().split(/\s+/);
        
        let englishCount = 0;
        let spanishCount = 0;
        let frenchCount = 0;

        words.forEach(word => {
            if (englishWords.includes(word)) englishCount++;
            if (spanishWords.includes(word)) spanishCount++;
            if (frenchWords.includes(word)) frenchCount++;
        });

        if (englishCount > spanishCount && englishCount > frenchCount) return 'en';
        if (spanishCount > englishCount && spanishCount > frenchCount) return 'es';
        if (frenchCount > englishCount && frenchCount > spanishCount) return 'fr';
        
        return 'en'; // Default to English
    }
}

// Enhanced TTS Manager with quality improvements
class EnhancedTTSManager {
    constructor() {
        this.voiceAnalyzer = new VoiceQualityAnalyzer();
        this.parameterOptimizer = new SpeechParameterOptimizer();
        this.textPreprocessor = new TextPreprocessor();
        this.currentVoice = null;
        this.currentVoiceAnalysis = null;
    }

    // Initialize with voice quality analysis
    async initialize() {
        await this.loadAndAnalyzeVoices();
        this.selectBestVoice();
    }

    async loadAndAnalyzeVoices() {
        return new Promise((resolve) => {
            const loadVoices = () => {
                const voices = speechSynthesis.getVoices();
                if (voices.length > 0) {
                    this.voices = this.voiceAnalyzer.rankVoices(voices);
                    resolve(this.voices);
                } else {
                    // Wait for voices to load
                    setTimeout(loadVoices, 100);
                }
            };
            
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
            
            loadVoices();
        });
    }

    selectBestVoice(preferences = {}) {
        if (!this.voices || this.voices.length === 0) return null;

        const bestVoice = this.voiceAnalyzer.getBestVoice(this.voices, preferences);
        this.currentVoiceAnalysis = bestVoice;
        
        // Find the actual SpeechSynthesisVoice object
        const actualVoice = speechSynthesis.getVoices().find(v => 
            (v.voiceURI || v.name) === bestVoice.voiceURI
        );
        
        this.currentVoice = actualVoice;
        return bestVoice;
    }

    createOptimizedUtterance(text, customParams = {}) {
        if (!text) return null;

        // Preprocess text for better pronunciation
        const processedText = this.textPreprocessor.preprocessText(text);

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(processedText);

        // Set optimized voice
        if (this.currentVoice) {
            utterance.voice = this.currentVoice;
        }

        // Optimize parameters
        const baseParams = {
            rate: customParams.rate || 1.0,
            pitch: customParams.pitch || 1.0,
            volume: customParams.volume || 0.9
        };

        const optimizedParams = this.parameterOptimizer.optimizeForClarity(
            baseParams, 
            this.currentVoiceAnalysis
        );

        // Apply optimized parameters
        utterance.rate = optimizedParams.rate;
        utterance.pitch = optimizedParams.pitch;
        utterance.volume = optimizedParams.volume;

        return utterance;
    }

    getVoiceQualityInfo() {
        return {
            currentVoice: this.currentVoiceAnalysis,
            availableVoices: this.voices,
            recommendations: this.currentVoiceAnalysis ? 
                this.parameterOptimizer.getRecommendations(this.currentVoiceAnalysis) : []
        };
    }

    // Test voice quality with standard phrase
    testVoice(voice = null, params = {}) {
        const testPhrase = "This is a test of voice quality and clarity. The quick brown fox jumps over the lazy dog.";
        
        if (voice) {
            const tempVoice = this.currentVoice;
            const tempAnalysis = this.currentVoiceAnalysis;
            
            // Temporarily switch to test voice
            this.currentVoice = voice;
            this.currentVoiceAnalysis = this.voiceAnalyzer.analyzeVoice(voice);
            
            const utterance = this.createOptimizedUtterance(testPhrase, params);
            
            // Restore original voice
            this.currentVoice = tempVoice;
            this.currentVoiceAnalysis = tempAnalysis;
            
            return utterance;
        }
        
        return this.createOptimizedUtterance(testPhrase, params);
    }
}

// Export for use in other files
window.VoiceQualityAnalyzer = VoiceQualityAnalyzer;
window.SpeechParameterOptimizer = SpeechParameterOptimizer;
window.TextPreprocessor = TextPreprocessor;
window.EnhancedTTSManager = EnhancedTTSManager;

console.log('Voice Quality Enhancement System loaded successfully');