

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AvatarConfig, UserPreferences } from '../types';
import * as audioUtils from '../services/audioUtils';

interface AvatarBuilderProps {
  onClose: () => void;
  onSave: (picUrl: string, config: AvatarConfig, traits: string, voiceId: string, modality: 'masculine' | 'feminine') => void;
  currentPrefs: UserPreferences;
}

const CATEGORIES = [
  { id: 'PHYSICAL', icon: 'fa-user-astronaut', label: 'Body' },
  { id: 'AESTHETIC', icon: 'fa-cut', label: 'Hair' },
  { id: 'WARDROBE', icon: 'fa-tshirt', label: 'Outfit' },
  { id: 'ENVIRONMENT', icon: 'fa-city', label: 'World' },
  { id: 'MIND', icon: 'fa-brain', label: 'Persona' }
];

const OPTIONS = {
  skinTone: ['Porcelain', 'Golden', 'Olive', 'Deep Espresso', 'Vibrant Chrome', 'Ether Blue'],
  hairStyle: ['Cyberpunk Undercut', 'Flowing Pixie', 'Sleek Ponytail', 'Spiked Crest', 'Soft Waves', 'Shaved', 'Braid'],
  hairColor: ['Obsidian', 'White Platinum', 'Electric Pink', 'Neon Green', 'Sunset Orange', 'Deep Indigo'],
  eyeColor: ['Luminous Cyan', 'Glowing Red', 'Amber', 'Violet', 'Silver', 'Void Black'],
  clothingStyle: ['Sleek Techwear', 'Minimalist Tuxedo', 'Gothic Victorian', 'Solarpunk Robes', 'Streetwear', 'Formal Attire'],
  vibe: ['Realistic 3D Render', 'Cinematic Portrait', 'Stylized Concept Art', 'Retro Pixel Art', 'Synthwave Hologram'],
  environment: ['Cyber Tokyo Alley', 'Ancient Zen Temple', 'Interstellar Bridge', 'Lush Forest Moon', 'Digital Void'],
  aspiration: ['Knowledge Seeker', 'Emotional Companion', 'Technical Expert', 'Creative Muse', 'Stoic Guardian'],
  traits: {
    Mental: ['Genius', 'Logical', 'Curious', 'Focused'],
    Social: ['Witty', 'Charismatic', 'Supportive', 'Direct'],
    Personal: ['Cheerful', 'Sarcastic', 'Stoic', 'Empathetic']
  }
};

const AvatarBuilder: React.FC<AvatarBuilderProps> = ({ onClose, onSave, currentPrefs }) => {
  const [activeTab, setActiveTab] = useState('PHYSICAL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentPrefs.assistantProfilePic || '');
  const [status, setStatus] = useState('');
  const [modality, setModality] = useState<'masculine' | 'feminine'>(currentPrefs.modality || 'masculine');
  const [selectedVoice, setSelectedVoice] = useState(currentPrefs.voiceId || 'Charon');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const [config, setConfig] = useState<AvatarConfig>(currentPrefs.avatarConfig || {
    hairStyle: 'Cyberpunk Undercut',
    hairColor: 'Obsidian',
    eyeColor: 'Luminous Cyan',
    skinTone: 'Porcelain',
    clothingStyle: 'Sleek Techwear',
    environment: 'Cyber Tokyo Alley',
    vibe: 'Realistic 3D Render',
    aspiration: 'Knowledge Seeker',
    traits: ['Genius', 'Supportive']
  });

  const voices = modality === 'feminine' 
    ? [{ id: 'Zephyr', name: 'Gabby' }, { id: 'Kore', name: 'Paula' }, { id: 'Aoede', name: 'Kai' }]
    : [{ id: 'Charon', name: 'John' }, { id: 'Puck', name: 'Caleb' }, { id: 'Fenrir', name: 'Able' }];

  const handlePreviewVoice = async (vid: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(vid);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: "Neural link established." }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: vid } } }
        }
      });
      // Correct: Always specify sampleRate 24000 for Gemini TTS output processing.
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64) {
        const buffer = await audioUtils.decodeAudioData(audioUtils.decode(base64), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setPreviewingVoice(null);
        source.start();
      } else setPreviewingVoice(null);
    } catch (e) { setPreviewingVoice(null); }
  };

  const toggleTrait = (trait: string) => {
    setConfig(prev => ({
      ...prev,
      traits: prev.traits.includes(trait) 
        ? prev.traits.filter(t => t !== trait)
        : [...prev.traits, trait].slice(-4) 
    }));
  };

  const randomize = () => {
    const randomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const allTraits = [...OPTIONS.traits.Mental, ...OPTIONS.traits.Social, ...OPTIONS.traits.Personal];
    
    setConfig({
      skinTone: randomItem(OPTIONS.skinTone),
      hairStyle: randomItem(OPTIONS.hairStyle),
      hairColor: randomItem(OPTIONS.hairColor),
      eyeColor: randomItem(OPTIONS.eyeColor),
      clothingStyle: randomItem(OPTIONS.clothingStyle),
      environment: randomItem(OPTIONS.environment),
      vibe: randomItem(OPTIONS.vibe),
      aspiration: randomItem(OPTIONS.aspiration),
      traits: [randomItem(allTraits), randomItem(allTraits)]
    });
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStatus('Mapping genetic markers...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const prompt = `A highly detailed, professional ${config.vibe} of an AI assistant.
        CHARACTER: ${modality} appearance, ${config.skinTone} skin tone, ${config.hairStyle} in ${config.hairColor}, glowing ${config.eyeColor} eyes.
        WARDROBE: Wearing ${config.clothingStyle}.
        VIBE: ${config.aspiration} and ${config.traits.join(', ')}.
        ENVIRONMENT: Centered portrait set in a ${config.environment}.
        QUALITY: Soft cinematic lighting, hyper-realistic details, masterpiece digital art.`;

      setStatus('Synthesizing neural assets...');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageUrl = null;
      if (response.candidates?.[0]?.content?.parts) {
        // Iterate through all parts as recommended in SDK guidelines to find inlineData.
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        setPreviewUrl(imageUrl);
        setStatus('Synthesis successful.');
      } else throw new Error("Synthesis failure: No image returned.");
    } catch (err: any) {
      setStatus(`Link Failure: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = () => {
    const instruction = `Identity: You are an AI named ${currentPrefs.assistantName}. 
      Primary Aspiration: ${config.aspiration}. 
      Core Traits: ${config.traits.join(', ')}. 
      Communication Style: Direct the modality towards a ${modality} tone.`;
    onSave(previewUrl, config, instruction, selectedVoice, modality);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 lg:p-10 animate-fade-in font-sans">
      <div className="w-full max-w-6xl h-[90vh] glass rounded-[4rem] border border-white/10 flex overflow-hidden shadow-2xl relative">
        
        {/* CAS Sidebar */}
        <div className="w-24 lg:w-32 bg-black/40 border-r border-white/5 flex flex-col items-center py-10 gap-6 flex-shrink-0">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group ${activeTab === cat.id ? 'bg-white text-black scale-110 shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              <i className={`fas ${cat.icon} text-lg lg:text-xl`}></i>
              <span className="text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{cat.label}</span>
            </button>
          ))}
          <div className="mt-auto flex flex-col items-center gap-4">
             <button onClick={randomize} className="w-12 h-12 rounded-full bg-white/5 text-blue-400 hover:bg-white/10 transition-all" title="Randomize Attributes"><i className="fas fa-dice"></i></button>
             <button onClick={onClose} className="text-gray-600 hover:text-red-500 transition-colors p-4"><i className="fas fa-times text-xl"></i></button>
          </div>
        </div>

        {/* Customization Panel */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          <div className="flex-1 p-8 lg:p-12 space-y-8 overflow-y-auto scrollbar-thin">
            <header className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl lg:text-5xl font-black text-white uppercase tracking-tighter">Neural <span className="text-blue-500">Studio</span></h2>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-2">Bio-Digital Character Creator</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-1 flex">
                 <button onClick={() => setModality('masculine')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${modality === 'masculine' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600'}`}>Masc</button>
                 <button onClick={() => setModality('feminine')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${modality === 'feminine' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600'}`}>Fem</button>
              </div>
            </header>

            <div className="space-y-10 animate-slide-up-reveal">
              {activeTab === 'PHYSICAL' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Skin Pigmentation</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {OPTIONS.skinTone.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, skinTone: opt}))} className={`px-4 py-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${config.skinTone === opt ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Optic Glow</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {OPTIONS.eyeColor.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, eyeColor: opt}))} className={`px-4 py-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${config.eyeColor === opt ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'AESTHETIC' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Follicle Architecture</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {OPTIONS.hairStyle.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, hairStyle: opt}))} className={`px-4 py-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${config.hairStyle === opt ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Chroma Tint</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {OPTIONS.hairColor.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, hairColor: opt}))} className={`px-4 py-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${config.hairColor === opt ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'WARDROBE' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Outfit Protocol</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {OPTIONS.clothingStyle.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, clothingStyle: opt}))} className={`px-4 py-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${config.clothingStyle === opt ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Rendering Style</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {OPTIONS.vibe.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, vibe: opt}))} className={`px-4 py-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${config.vibe === opt ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ENVIRONMENT' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Neural Background</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {OPTIONS.environment.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, environment: opt}))} className={`px-6 py-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${config.environment === opt ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>
                          <span className="text-[10px] font-black uppercase">{opt}</span>
                          <i className={`fas ${config.environment === opt ? 'fa-check-circle' : 'fa-circle'} text-xs opacity-40`}></i>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Core Aspiration</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {OPTIONS.aspiration.map(opt => (
                        <button key={opt} onClick={() => setConfig(p => ({...p, aspiration: opt}))} className={`px-4 py-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${config.aspiration === opt ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/5 bg-white/5 text-gray-600'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'MIND' && (
                <div className="space-y-8">
                  {Object.entries(OPTIONS.traits).map(([category, traits]) => (
                    <div key={category} className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{category} Traits</label>
                      <div className="flex flex-wrap gap-2">
                        {traits.map(trait => (
                          <button 
                            key={trait} 
                            onClick={() => toggleTrait(trait)} 
                            className={`px-4 py-2 rounded-xl border transition-all text-[9px] font-bold uppercase ${config.traits.includes(trait) ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/5 text-gray-600 border-white/5 hover:border-white/10'}`}
                          >
                            {trait}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-white/5 space-y-4">
                     <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Bio-Voice Selection</label>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {voices.map(v => (
                          <div key={v.id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${selectedVoice === v.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5'}`}>
                            <button onClick={() => setSelectedVoice(v.id)} className="text-left flex-1">
                              <p className="text-[10px] font-black uppercase text-white">{v.name}</p>
                            </button>
                            <button onClick={() => handlePreviewVoice(v.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${previewingVoice === v.id ? 'bg-blue-500 animate-pulse' : 'bg-white/5 text-gray-400'}`}>
                              <i className={`fas ${previewingVoice === v.id ? 'fa-circle-notch fa-spin' : 'fa-play'} text-[10px]`}></i>
                            </button>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-10 flex gap-4">
               <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`flex-1 h-20 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all ${isGenerating ? 'bg-white/5 text-gray-600 cursor-wait' : 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-xl'}`}
               >
                 {isGenerating ? <i className="fas fa-atom fa-spin"></i> : <i className="fas fa-sparkles"></i>}
                 {isGenerating ? 'Synthesizing Biological Data...' : 'Generate Neural Identity'}
               </button>
               {previewUrl && (
                 <button 
                  onClick={handleFinalize}
                  className="px-10 h-20 rounded-3xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-500/20"
                 >
                   Establish Link
                 </button>
               )}
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="w-full lg:w-[450px] bg-black/50 border-l border-white/5 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden">
             {/* Sims-like Backdrop */}
             <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(59,130,246,0.3)_0%,transparent_70%)] animate-slow-spin"></div>
             </div>

             <div className="w-full aspect-square rounded-[4rem] overflow-hidden border border-white/10 relative shadow-2xl bg-zinc-950 z-10 group">
                {isGenerating && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md gap-4">
                     <div className="w-32 h-[1px] bg-blue-500/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-400 animate-scanline"></div>
                     </div>
                     <span className="text-[9px] font-mono text-blue-400 uppercase tracking-[0.5em] animate-pulse">{status}</span>
                  </div>
                )}
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover animate-fade-in group-hover:scale-110 transition-transform duration-1000" alt="Avatar Preview" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-10">
                    <i className="fas fa-user-astronaut text-8xl mb-4"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest">Neural Link Offline</p>
                  </div>
                )}
             </div>

             <div className="mt-10 w-full space-y-6 z-10">
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Genetic Integrity</span>
                      <div className="flex gap-1">
                        {Array.from({length: 12}).map((_, i) => (
                          <div key={i} className={`w-3 h-1 rounded-full ${i < (previewUrl ? 12 : 6) ? 'bg-blue-500' : 'bg-white/5'}`}></div>
                        ))}
                      </div>
                   </div>
                   <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase">{previewUrl ? 'COMPLETE' : 'INCOMPLETE'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Traits</p>
                      <div className="flex flex-wrap gap-1">
                        {config.traits.map(t => <span key={t} className="text-[7px] text-white/40 uppercase font-black">{t}</span>)}
                      </div>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Voice</p>
                      <span className="text-[7px] text-white/40 uppercase font-black">{selectedVoice} v2.5</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarBuilder;
