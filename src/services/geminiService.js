import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY_STORAGE = 'avatarOS_gemini_api_key';

export const geminiService = {
  apiKey: null,
  genAI: null,

  // Initialize with API key
  init(apiKey) {
    if (!apiKey || !apiKey.startsWith('AIza')) {
      throw new Error('Invalid API key. Must start with "AIza"');
    }
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.saveApiKey(apiKey);
    return true;
  },

  // Check if initialized
  isInitialized() {
    return !!this.genAI;
  },

  // Save API key to localStorage
  saveApiKey(apiKey) {
    try {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  },

  // Load API key from localStorage
  loadApiKey() {
    try {
      const key = localStorage.getItem(API_KEY_STORAGE);
      if (key) {
        this.init(key);
        return true;
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
    return false;
  },

  // Clear API key
  clearApiKey() {
    this.apiKey = null;
    this.genAI = null;
    localStorage.removeItem(API_KEY_STORAGE);
  },

  // Convert base64 image to Gemini format
  base64ToGenerativePart(base64Data, mimeType = 'image/jpeg') {
    // Remove data URL prefix if present
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    return {
      inlineData: {
        data: base64Content,
        mimeType
      }
    };
  },

  // Generate personalized image description/prompt
  async analyzePersona(persona) {
    if (!this.isInitialized()) {
      throw new Error('Gemini not initialized. Please set API key.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const images = [];

    // Add texture photo
    if (persona.texturePhoto) {
      images.push(this.base64ToGenerativePart(persona.texturePhoto));
    }

    // Add volumetric frames
    if (persona.volumetricFrames?.length > 0) {
      persona.volumetricFrames.forEach(frame => {
        images.push(this.base64ToGenerativePart(frame));
      });
    }

    if (images.length === 0) {
      throw new Error('No images found in persona');
    }

    const prompt = `Analyze these photos of a person and create a detailed description of their appearance that can be used to generate consistent images of them. Include:
- Face shape and structure
- Hair color, style, and texture
- Eye color and shape
- Skin tone
- Distinctive features
- Approximate age range

Provide a concise but detailed description that captures their unique appearance.`;

    const result = await model.generateContent([prompt, ...images]);
    const response = await result.response;
    return response.text();
  },

  // Generate image with persona context
  async generateWithPersona(persona, userPrompt, personaDescription = null) {
    if (!this.isInitialized()) {
      throw new Error('Gemini not initialized. Please set API key.');
    }

    // Get persona description if not provided
    let description = personaDescription;
    if (!description) {
      description = await this.analyzePersona(persona);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const images = [];

    // Add reference images
    if (persona.texturePhoto) {
      images.push(this.base64ToGenerativePart(persona.texturePhoto));
    }

    // Add a couple volumetric frames for reference
    if (persona.volumetricFrames?.length > 0) {
      const framesToUse = persona.volumetricFrames.slice(0, 2);
      framesToUse.forEach(frame => {
        images.push(this.base64ToGenerativePart(frame));
      });
    }

    const fullPrompt = `You are helping create a personalized image based on a specific person.

PERSON DESCRIPTION:
${description}

USER REQUEST:
${userPrompt}

Based on the reference photos provided and the person description above, create a detailed prompt that could be used with an image generation AI to create the requested scene featuring this specific person. The prompt should:
1. Maintain the person's exact appearance from the photos
2. Place them in the scene/context requested by the user
3. Include appropriate lighting, composition, and style details
4. Be detailed enough for high-quality image generation

Generate the optimized prompt:`;

    const result = await model.generateContent([fullPrompt, ...images]);
    const response = await result.response;
    return {
      generatedPrompt: response.text(),
      personaDescription: description
    };
  },

  // Simple text generation (for testing)
  async generateText(prompt) {
    if (!this.isInitialized()) {
      throw new Error('Gemini not initialized. Please set API key.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  },

  // Generate content with images
  async generateWithImages(prompt, base64Images) {
    if (!this.isInitialized()) {
      throw new Error('Gemini not initialized. Please set API key.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imageParts = base64Images.map(img => this.base64ToGenerativePart(img));
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
  }
};

// Auto-load API key on module load
geminiService.loadApiKey();
