const STORAGE_KEY = 'avatarOS_personas';

export const personaStorage = {
  // Get all personas
  getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load personas:', error);
      return [];
    }
  },

  // Get a single persona by ID
  getById(id) {
    const personas = this.getAll();
    return personas.find(p => p.id === id) || null;
  },

  // Create a new persona
  create(name) {
    const personas = this.getAll();
    const newPersona = {
      id: `persona_${Date.now()}`,
      name: name || `Persona ${personas.length + 1}`,
      createdAt: new Date().toISOString(),
      texturePhoto: null,      // Main headshot (base64)
      volumetricFrames: [],    // Array of frames from video scan (base64)
      metadata: {
        captureComplete: false,
        photoTaken: false,
        videoTaken: false
      }
    };

    personas.push(newPersona);
    this.saveAll(personas);
    return newPersona;
  },

  // Update persona
  update(id, updates) {
    const personas = this.getAll();
    const index = personas.findIndex(p => p.id === id);

    if (index === -1) {
      console.error('Persona not found:', id);
      return null;
    }

    personas[index] = { ...personas[index], ...updates };
    this.saveAll(personas);
    return personas[index];
  },

  // Save texture photo to persona
  saveTexturePhoto(id, base64Image) {
    return this.update(id, {
      texturePhoto: base64Image,
      metadata: {
        ...this.getById(id)?.metadata,
        photoTaken: true
      }
    });
  },

  // Add volumetric frame to persona
  addVolumetricFrame(id, base64Image) {
    const persona = this.getById(id);
    if (!persona) return null;

    const frames = [...(persona.volumetricFrames || []), base64Image];
    return this.update(id, {
      volumetricFrames: frames
    });
  },

  // Mark capture as complete
  markComplete(id) {
    const persona = this.getById(id);
    if (!persona) return null;

    return this.update(id, {
      metadata: {
        ...persona.metadata,
        videoTaken: true,
        captureComplete: true
      }
    });
  },

  // Delete a persona
  delete(id) {
    const personas = this.getAll();
    const filtered = personas.filter(p => p.id !== id);
    this.saveAll(filtered);
    return true;
  },

  // Get active/current persona (most recent incomplete or last created)
  getActive() {
    const personas = this.getAll();

    // Find incomplete persona first
    const incomplete = personas.find(p => !p.metadata?.captureComplete);
    if (incomplete) return incomplete;

    // Otherwise return most recent
    return personas[personas.length - 1] || null;
  },

  // Save all personas to localStorage
  saveAll(personas) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
      return true;
    } catch (error) {
      console.error('Failed to save personas:', error);
      // Handle quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Consider deleting old personas.');
      }
      return false;
    }
  },

  // Clear all personas
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  },

  // Get storage usage info
  getStorageInfo() {
    const data = localStorage.getItem(STORAGE_KEY) || '';
    const sizeInBytes = new Blob([data]).size;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    const personas = this.getAll();

    return {
      totalPersonas: personas.length,
      sizeInBytes,
      sizeInMB: `${sizeInMB} MB`,
      completedPersonas: personas.filter(p => p.metadata?.captureComplete).length
    };
  }
};

// Helper function to capture frame from video element
export function captureFrameFromVideo(videoElement, quality = 0.92) {
  if (!videoElement || videoElement.readyState !== 4) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');

  // Mirror the image (since webcam is mirrored)
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0);

  return canvas.toDataURL('image/jpeg', quality);
}
