import React, { useState, useEffect } from 'react';
import { Sparkles, Key, Send, Loader2, AlertCircle, CheckCircle, Image, Video, Copy, RefreshCcw } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { veo3Service } from '../services/veo3Service';

export function GeminiStudio({ persona, onBack }) {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [mode, setMode] = useState('image'); // 'image' or 'video'
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [personaDescription, setPersonaDescription] = useState(null);

  // Check if API key is already set
  useEffect(() => {
    setIsApiKeySet(geminiService.isInitialized());
  }, []);

  const handleSetApiKey = () => {
    try {
      geminiService.init(apiKey);
      setIsApiKeySet(true);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      let response;
      if (mode === 'video') {
        response = await veo3Service.generateVideoPrompt(
          persona,
          prompt,
          personaDescription
        );
        setResult({ generatedPrompt: response.videoPrompt, isVideo: true });
      } else {
        response = await geminiService.generateWithPersona(
          persona,
          prompt,
          personaDescription
        );
        setResult({ ...response, isVideo: false });
      }
      setPersonaDescription(response.personaDescription);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    const text = result?.generatedPrompt || result?.videoPrompt;
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const imageTemplates = [
    "Create a photo of me riding a horse on a beach at sunset",
    "Generate a professional headshot of me in a business suit",
    "Create an image of me as a superhero flying over a city"
  ];

  const videoTemplates = veo3Service.getTemplates().map(t => t.prompt);

  const promptTemplates = mode === 'video' ? videoTemplates : imageTemplates;

  if (!isApiKeySet) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Setup Gemini API</h2>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-2">
            Enter your Google AI Studio API key to enable generation
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleSetApiKey}
            disabled={!apiKey.trim()}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-black disabled:text-gray-500 font-bold py-3 rounded-xl transition-colors"
          >
            Save API Key
          </button>

          <p className="text-xs text-gray-400 dark:text-neutral-500 text-center">
            Get your API key from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-500 hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-yellow-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gemini Studio</h2>
        <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
          Generate personalized content with your persona
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-gray-100 dark:bg-neutral-800 rounded-xl p-1">
        <button
          onClick={() => { setMode('image'); setPrompt(''); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'image'
              ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300'
          }`}
        >
          <Image className="w-4 h-4" />
          Image
        </button>
        <button
          onClick={() => { setMode('video'); setPrompt(''); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'video'
              ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300'
          }`}
        >
          <Video className="w-4 h-4" />
          Video
        </button>
      </div>

      {/* Persona Preview */}
      {persona?.texturePhoto && (
        <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-neutral-800 rounded-xl">
          <img
            src={persona.texturePhoto}
            alt="Your persona"
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {persona.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {persona.volumetricFrames?.length || 0} frames captured
            </p>
          </div>
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        </div>
      )}

      {/* Prompt Input */}
      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to generate..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
        />

        {/* Quick Templates */}
        <div className="flex flex-wrap gap-2">
          {promptTemplates.slice(0, 3).map((template, i) => (
            <button
              key={i}
              onClick={() => setPrompt(template)}
              className="text-xs px-3 py-1.5 bg-gray-200 dark:bg-neutral-700 hover:bg-yellow-500/20 text-gray-600 dark:text-neutral-300 rounded-full transition-colors"
            >
              {template.split(' ').slice(0, 4).join(' ')}...
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-black disabled:text-gray-500 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Generate {mode === 'video' ? 'Video' : 'Image'} Prompt
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-3 p-4 bg-gray-100 dark:bg-neutral-800 rounded-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {result?.isVideo ? 'Video Prompt (Veo3)' : 'Image Prompt'}
            </h3>
            <button
              onClick={handleCopyPrompt}
              className="p-2 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-neutral-300 whitespace-pre-wrap">
            {result.generatedPrompt}
          </p>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={onBack}
        className="w-full text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white font-medium py-2 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCcw className="w-4 h-4" />
        New Capture
      </button>
    </div>
  );
}
