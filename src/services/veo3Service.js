import { geminiService } from './geminiService';

export const veo3Service = {
  // Generate optimized video prompt using persona
  async generateVideoPrompt(persona, userPrompt, personaDescription = null) {
    if (!geminiService.isInitialized()) {
      throw new Error('Gemini not initialized. Please set API key first.');
    }

    // Get persona description if not provided
    let description = personaDescription;
    if (!description) {
      description = await geminiService.analyzePersona(persona);
    }

    const model = geminiService.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const images = [];

    // Add reference images
    if (persona.texturePhoto) {
      images.push(geminiService.base64ToGenerativePart(persona.texturePhoto));
    }

    // Add volumetric frames for motion reference
    if (persona.volumetricFrames?.length > 0) {
      persona.volumetricFrames.forEach(frame => {
        images.push(geminiService.base64ToGenerativePart(frame));
      });
    }

    const fullPrompt = `You are helping create a personalized VIDEO based on a specific person.

PERSON DESCRIPTION:
${description}

USER REQUEST:
${userPrompt}

Based on the reference photos provided (showing the person from multiple angles) and the description above, create a detailed prompt optimized for Veo3 video generation. The prompt should:

1. APPEARANCE: Maintain the exact appearance of the person from the photos
2. MOTION: Describe natural movements and actions appropriate for the scene
3. CAMERA: Specify camera movements, angles, and transitions
4. DURATION: Suggest appropriate video length (5-15 seconds)
5. STYLE: Include lighting, atmosphere, and cinematic style
6. AUDIO: Suggest background music/sound if appropriate

Format the output as:

**Video Prompt:**
[Main generation prompt]

**Camera Direction:**
[Camera movements and angles]

**Duration:** [X seconds]

**Style Notes:**
[Lighting, atmosphere, mood]

**Audio Suggestion:**
[Optional sound/music]

Generate the optimized Veo3 prompt:`;

    const result = await model.generateContent([fullPrompt, ...images]);
    const response = await result.response;

    return {
      videoPrompt: response.text(),
      personaDescription: description,
      metadata: {
        frameCount: persona.volumetricFrames?.length || 0,
        hasTextureMap: !!persona.texturePhoto,
        generatedAt: new Date().toISOString()
      }
    };
  },

  // Parse the generated prompt into structured sections
  parseVideoPrompt(rawPrompt) {
    const sections = {
      mainPrompt: '',
      cameraDirection: '',
      duration: '',
      styleNotes: '',
      audioSuggestion: ''
    };

    // Extract sections using regex
    const mainMatch = rawPrompt.match(/\*\*Video Prompt:\*\*\s*([\s\S]*?)(?=\*\*Camera Direction:|$)/i);
    const cameraMatch = rawPrompt.match(/\*\*Camera Direction:\*\*\s*([\s\S]*?)(?=\*\*Duration:|$)/i);
    const durationMatch = rawPrompt.match(/\*\*Duration:\*\*\s*([\s\S]*?)(?=\*\*Style Notes:|$)/i);
    const styleMatch = rawPrompt.match(/\*\*Style Notes:\*\*\s*([\s\S]*?)(?=\*\*Audio Suggestion:|$)/i);
    const audioMatch = rawPrompt.match(/\*\*Audio Suggestion:\*\*\s*([\s\S]*?)$/i);

    if (mainMatch) sections.mainPrompt = mainMatch[1].trim();
    if (cameraMatch) sections.cameraDirection = cameraMatch[1].trim();
    if (durationMatch) sections.duration = durationMatch[1].trim();
    if (styleMatch) sections.styleNotes = styleMatch[1].trim();
    if (audioMatch) sections.audioSuggestion = audioMatch[1].trim();

    return sections;
  },

  // Video prompt templates
  getTemplates() {
    return [
      {
        id: 'walking',
        name: 'Walking Scene',
        prompt: 'Create a video of me walking confidently through a city street'
      },
      {
        id: 'talking',
        name: 'Talking Head',
        prompt: 'Generate a video of me speaking to the camera in a professional setting'
      },
      {
        id: 'action',
        name: 'Action Shot',
        prompt: 'Create a video of me running through a forest trail at golden hour'
      },
      {
        id: 'cinematic',
        name: 'Cinematic Portrait',
        prompt: 'Generate a cinematic slow-motion video of me looking at the camera with dramatic lighting'
      },
      {
        id: 'dance',
        name: 'Dance Move',
        prompt: 'Create a video of me doing a simple dance move in a studio with colorful lights'
      }
    ];
  },

  // Note: Actual Veo3 API integration would go here
  // Currently, Veo3 is available through:
  // - Google AI Studio (limited)
  // - Vertex AI (enterprise)
  //
  // When public API becomes available, implement:
  // async generateVideo(prompt, options) { ... }
};
