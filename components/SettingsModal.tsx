import React, { useState } from 'react';
import { UserPreferences, PersonalityType, BackgroundStyle } from '../types';

interface Voice { id: string; name: string; tone: string; gender: string; }

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: UserPreferences;
  setPrefs: React.Dispatch<React.SetStateAction<UserPreferences>>;
  voices: Voice[];
  personalities: Record<PersonalityType, string>;
  isTV: boolean;
  isWearable: boolean;
  onPreviewVoice?: (voiceId: string) => void;
  previewingVoiceId?: string | null;
  onOpenAvatarBuilder: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, prefs, setPrefs, voices, personalities, isTV, isWearable, onPreviewVoice, previewingVoiceId, onOpenAvatarBuilder,
}) => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'UI STUDIO' | 'AUDIO' | 'SYSTEM'>('IDENTITY');
  if (!isOpen) return null;

  const FONTS: UserPreferences['fontFamily'][] = ['Inter', 'Outfit', 'Roboto Mono', 'Bebas Neue', 'System'];
  const BG_STYLES: BackgroundStyle[] = ['grid', 'aurora', 'noise', 'solid', 'image'];
  const THEME_OPTIONS: {id: UserPreferences['theme'], name: string, icon: string}[] = [
    { id: 'cosmic', name: 'Cosmic', icon: 'fa-user-astronaut' },
    { id: 'emerald', name: 'Emerald', icon: 'fa-leaf' },
    { id: 'ruby', name: 'Ruby', icon: 'fa-gem' },
    { id: 'obsidian', name: 'Obsidian', icon: 'fa-moon' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'fa-whatsapp' },
    { id: 'facebook', name: 'Facebook', icon: 'fa-facebook' },
    { id: 'telegram', name: 'Telegram', icon: 'fa-telegram' },
    { id: 'instagram', name: 'Instagram', icon: 'fa-instagram' },
    { id: 'custom', name: 'Studio', icon: 'fa-palette' }
  ];

  const tabClass = (tab: typeof activeTab) => `px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-500 hover:text-white'}`;

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-8 animate-fade-in">
      <div className="w-full max-w-5xl bg-[#02020a] border border-white/10 rounded-[3rem] lg:rounded-[4rem] relative flex flex-col h-[85vh] shadow-2xl overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between p-4 md:p-8 border-b border-white/5 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <button onClick={() => setActiveTab('IDENTITY')} className={tabClass('IDENTITY')}>Identity</button>
            <button onClick={() => setActiveTab('UI STUDIO')} className={tabClass('UI STUDIO')}>UI Studio</button>
            <button onClick={() => setActiveTab('AUDIO')} className={tabClass('AUDIO')}>Audio Tuning</button>
            <button onClick={() => setActiveTab('SYSTEM')} className={tabClass('SYSTEM')}>Directives</button>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2"><i className="fas fa-times text-xl"></i></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-thin space-y-12">
          
          {activeTab === 'IDENTITY' && (
            <div className="space-y-10 animate-slide-up-reveal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Assistant Name</label>
                  <input type="text" value={prefs.assistantName} onChange={(e) => setPrefs(p => ({ ...p, assistantName: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-xl focus:border-[var(--theme-primary)] outline-none" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Neural Identity Link (Avatar)</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
                        {prefs.assistantProfilePic ? (
                          <img src={prefs.assistantProfilePic} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-700">
                            <i className="fas fa-user-astronaut"></i>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <button 
                          onClick={onOpenAvatarBuilder}
                          className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-sparkles"></i>
                          Neural Studio
                        </button>
                        <button 
                          onClick={() => document.getElementById('profile-upload')?.click()}
                          className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-upload"></i>
                          Upload Local
                        </button>
                        <input 
                          type="file" 
                          id="profile-upload" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setPrefs(p => ({ ...p, assistantProfilePic: ev.target?.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Profile URL (Manual Override)</label>
                <input type="text" value={prefs.assistantProfilePic || ''} onChange={(e) => setPrefs(p => ({ ...p, assistantProfilePic: e.target.value }))} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold text-sm focus:border-[var(--theme-primary)] outline-none" />
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Behavioral Archetype</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(personalities) as PersonalityType[]).map(p => (
                    <button key={p} onClick={() => setPrefs(pr => ({ ...pr, personality: p }))} className={`py-4 rounded-xl border-2 transition-all font-black text-[9px] uppercase tracking-widest ${prefs.personality === p ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'border-white/5 text-gray-700 hover:border-white/10'}`}>{p}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Session Init Greeting</label>
                <textarea value={prefs.greeting} onChange={(e) => setPrefs(p => ({ ...p, greeting: e.target.value }))} className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-bold focus:border-[var(--theme-primary)] outline-none resize-none" />
              </div>
            </div>
          )}

          {activeTab === 'UI STUDIO' && (
            <div className="space-y-16 animate-slide-up-reveal">
               {/* Preset Theme Matrix */}
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Interface Blueprint Presets</label>
                    <span className="text-[8px] bg-white/5 px-2 py-1 rounded text-white/40 uppercase font-bold tracking-widest">{prefs.theme} active</span>
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {THEME_OPTIONS.map(t => {
                      const isBrand = ['fa-whatsapp', 'fa-facebook', 'fa-telegram', 'fa-instagram'].includes(t.icon);
                      return (
                        <button 
                          key={t.id} 
                          onClick={() => setPrefs(p => ({ ...p, theme: t.id }))} 
                          className={`group p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${prefs.theme === t.id ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'border-white/5 bg-white/5 text-gray-500 hover:text-white hover:border-white/10'}`}
                        >
                          <i className={`${isBrand ? 'fab' : 'fas'} ${t.icon} text-lg md:text-xl`}></i>
                          <span className="text-[8px] font-black uppercase tracking-widest">{t.name}</span>
                        </button>
                      );
                    })}
                 </div>
               </div>

               {/* Advanced UI Builder */}
               <div className="pt-10 border-t border-white/5 space-y-12">
                  <header>
                    <h3 className="text-lg font-black uppercase tracking-tighter">UI Construction Studio</h3>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Build and modify your own neural interface archetype</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Colors */}
                    <div className="space-y-8">
                       <label className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-[0.2em] block mb-4">Color DNA</label>
                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-gray-700 uppercase">Primary Accent</span>
                            <div className="flex items-center gap-3">
                              <input type="color" value={prefs.primaryColor} onChange={(e) => setPrefs(p => ({ ...p, primaryColor: e.target.value, theme: 'custom' }))} className="w-10 h-10 rounded-xl cursor-pointer bg-transparent" />
                              <input type="text" value={prefs.primaryColor} onChange={(e) => setPrefs(p => ({ ...p, primaryColor: e.target.value, theme: 'custom' }))} className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 font-mono text-[10px]" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-gray-700 uppercase">Secondary Accent</span>
                            <div className="flex items-center gap-3">
                              <input type="color" value={prefs.secondaryColor} onChange={(e) => setPrefs(p => ({ ...p, secondaryColor: e.target.value, theme: 'custom' }))} className="w-10 h-10 rounded-xl cursor-pointer bg-transparent" />
                              <input type="text" value={prefs.secondaryColor} onChange={(e) => setPrefs(p => ({ ...p, secondaryColor: e.target.value, theme: 'custom' }))} className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 font-mono text-[10px]" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-gray-700 uppercase">User Bubble</span>
                            <div className="flex items-center gap-3">
                              <input type="color" value={prefs.userBubbleColor || '#3b82f6'} onChange={(e) => setPrefs(p => ({ ...p, userBubbleColor: e.target.value, theme: 'custom' }))} className="w-10 h-10 rounded-xl cursor-pointer bg-transparent" />
                              <input type="text" value={prefs.userBubbleColor || ''} placeholder="#hex" onChange={(e) => setPrefs(p => ({ ...p, userBubbleColor: e.target.value, theme: 'custom' }))} className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 font-mono text-[10px]" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-gray-700 uppercase">Assistant Bubble</span>
                            <div className="flex items-center gap-3">
                              <input type="color" value={prefs.agentBubbleColor || '#1a1a1a'} onChange={(e) => setPrefs(p => ({ ...p, agentBubbleColor: e.target.value, theme: 'custom' }))} className="w-10 h-10 rounded-xl cursor-pointer bg-transparent" />
                              <input type="text" value={prefs.agentBubbleColor || ''} placeholder="#hex" onChange={(e) => setPrefs(p => ({ ...p, agentBubbleColor: e.target.value, theme: 'custom' }))} className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 font-mono text-[10px]" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-gray-700 uppercase">User Text</span>
                            <div className="flex items-center gap-3">
                              <input type="color" value={prefs.userBubbleTextColor || '#ffffff'} onChange={(e) => setPrefs(p => ({ ...p, userBubbleTextColor: e.target.value, theme: 'custom' }))} className="w-10 h-10 rounded-xl cursor-pointer bg-transparent" />
                              <input type="text" value={prefs.userBubbleTextColor || ''} placeholder="#hex" onChange={(e) => setPrefs(p => ({ ...p, userBubbleTextColor: e.target.value, theme: 'custom' }))} className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 font-mono text-[10px]" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[8px] font-bold text-gray-700 uppercase">Assistant Text</span>
                            <div className="flex items-center gap-3">
                              <input type="color" value={prefs.agentBubbleTextColor || '#e5e7eb'} onChange={(e) => setPrefs(p => ({ ...p, agentBubbleTextColor: e.target.value, theme: 'custom' }))} className="w-10 h-10 rounded-xl cursor-pointer bg-transparent" />
                              <input type="text" value={prefs.agentBubbleTextColor || ''} placeholder="#hex" onChange={(e) => setPrefs(p => ({ ...p, agentBubbleTextColor: e.target.value, theme: 'custom' }))} className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 font-mono text-[10px]" />
                            </div>
                          </div>
                       </div>
                    </div>

                    {/* Typography & Physics */}
                    <div className="space-y-8">
                       <label className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-[0.2em] block mb-4">Ergonomics & Physics</label>
                       
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-600">
                             <span>Core Roundness</span>
                             <span>{prefs.borderRadius}</span>
                          </div>
                          <input type="range" min="0" max="64" step="2" value={parseInt(prefs.borderRadius)} onChange={(e) => setPrefs(p => ({ ...p, borderRadius: `${e.target.value}px` }))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[var(--theme-primary)]" />
                       </div>

                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-600">
                             <span>Bubble Curvature</span>
                             <span>{prefs.bubbleRadius || 'Inherited'}</span>
                          </div>
                          <input type="range" min="0" max="64" step="2" value={parseInt(prefs.bubbleRadius || '24')} onChange={(e) => setPrefs(p => ({ ...p, bubbleRadius: `${e.target.value}px`, theme: 'custom' }))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[var(--theme-primary)]" />
                       </div>

                       <div className="space-y-4">
                          <label className="text-[9px] font-black text-gray-600 uppercase">Typography Engine</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {FONTS.map(f => (
                              <button key={f} onClick={() => setPrefs(p => ({ ...p, fontFamily: f }))} className={`py-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${prefs.fontFamily === f ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-black' : 'border-white/10 text-gray-600 hover:text-white'}`} style={{ fontFamily: f }}>
                                <span className="text-[10px] font-bold">Aa</span>
                                <span className="text-[7px] uppercase font-black tracking-tighter">{f}</span>
                              </button>
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Backdrop & Atmospheric Studio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                     <div className="space-y-6">
                        <label className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-[0.2em]">Atmospheric Backdrop</label>
                        <div className="grid grid-cols-3 gap-3">
                          {BG_STYLES.map(s => (
                            <button key={s} onClick={() => setPrefs(p => ({ ...p, bgStyle: s }))} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${prefs.bgStyle === s ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'border-white/5 bg-white/5 text-gray-600'}`}>
                              <i className={`fas ${s === 'grid' ? 'fa-th' : s === 'aurora' ? 'fa-wind' : s === 'noise' ? 'fa-braille' : s === 'solid' ? 'fa-square' : 'fa-image'} text-lg`}></i>
                              <span className="text-[7px] font-black uppercase tracking-widest">{s}</span>
                            </button>
                          ))}
                        </div>
                        {prefs.bgStyle === 'image' && (
                          <input type="text" value={prefs.bgImage || ''} placeholder="Background Image URL (https://...)" onChange={(e) => setPrefs(p => ({ ...p, bgImage: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-[var(--theme-primary)]" />
                        )}
                     </div>

                     <div className="space-y-8">
                        <label className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-[0.2em]">Material Properties (Glass)</label>
                        <div className="grid grid-cols-2 gap-10">
                           <div className="space-y-4">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-600">
                                 <span>Density</span>
                                 <span>{Math.round((prefs.glassOpacity || 0.04) * 100)}%</span>
                              </div>
                              <input type="range" min="0" max="0.4" step="0.01" value={prefs.glassOpacity} onChange={(e) => setPrefs(p => ({ ...p, glassOpacity: parseFloat(e.target.value), theme: 'custom' }))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[var(--theme-primary)]" />
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-600">
                                 <span>Refraction (Blur)</span>
                                 <span>{prefs.glassBlur}</span>
                              </div>
                              <input type="range" min="0" max="80" step="4" value={parseInt(prefs.glassBlur || '32')} onChange={(e) => setPrefs(p => ({ ...p, glassBlur: `${e.target.value}px`, theme: 'custom' }))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[var(--theme-primary)]" />
                           </div>
                        </div>
                        <div className="flex items-center gap-10">
                           <label className="flex items-center gap-3 cursor-pointer group">
                             <input type="checkbox" checked={prefs.showGrid} onChange={(e) => setPrefs(p => ({ ...p, showGrid: e.target.checked }))} className="hidden" />
                             <div className={`w-10 h-5 rounded-full transition-all relative ${prefs.showGrid ? 'bg-blue-600' : 'bg-white/10'}`}>
                               <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${prefs.showGrid ? 'left-6' : 'left-1'}`}></div>
                             </div>
                             <span className="text-[9px] font-black uppercase text-gray-600 group-hover:text-white transition-colors">Digital Grid Overlay</span>
                           </label>
                           <label className="flex items-center gap-3 cursor-pointer group">
                             <input type="checkbox" checked={prefs.showNoise} onChange={(e) => setPrefs(p => ({ ...p, showNoise: e.target.checked }))} className="hidden" />
                             <div className={`w-10 h-5 rounded-full transition-all relative ${prefs.showNoise ? 'bg-blue-600' : 'bg-white/10'}`}>
                               <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${prefs.showNoise ? 'left-6' : 'left-1'}`}></div>
                             </div>
                             <span className="text-[9px] font-black uppercase text-gray-600 group-hover:text-white transition-colors">Film Grain Texture</span>
                           </label>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'AUDIO' && (
            <div className="space-y-12 animate-slide-up-reveal">
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Vocal Selection</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {voices.map(v => (
                      <div key={v.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${prefs.voiceId === v.id ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10' : 'border-white/5 bg-white/5'}`}>
                        <button onClick={() => setPrefs(p => ({ ...p, voiceId: v.id }))} className="text-left flex-1">
                          <p className="text-xs font-black uppercase tracking-widest">{v.name}</p>
                          <p className="text-[8px] text-gray-600">{v.tone}</p>
                        </button>
                        <button onClick={() => onPreviewVoice?.(v.id)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${previewingVoiceId === v.id ? 'bg-[var(--theme-primary)] animate-pulse' : 'bg-white/5 text-gray-600 hover:text-white'}`}><i className={`fas ${previewingVoiceId === v.id ? 'fa-circle-notch fa-spin' : 'fa-play'} text-xs`}></i></button>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Cadence Speed: {prefs.speechSpeed}x</label>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={prefs.speechSpeed} onChange={(e) => setPrefs(p => ({ ...p, speechSpeed: parseFloat(e.target.value) }))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[var(--theme-primary)]" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Tonal Pitch: {prefs.speechPitch}x</label>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={prefs.speechPitch} onChange={(e) => setPrefs(p => ({ ...p, speechPitch: parseFloat(e.target.value) }))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[var(--theme-primary)]" />
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'SYSTEM' && (
            <div className="space-y-10 animate-slide-up-reveal">
               <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-2xl"><i className="fas fa-microchip"></i></div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-widest">Identity Segment Privacy</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">All chat records, memories, and files are keyed to your username. No other user on this system can access your segment data.</p>
                  </div>
               </div>
               
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Direct Personality Matrix</label>
                  <textarea value={prefs.customPersonality} onChange={(e) => setPrefs(p => ({ ...p, customPersonality: e.target.value }))} placeholder="Provide specific behavior instructions..." className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-xs font-mono text-gray-400 focus:border-[var(--theme-primary)] outline-none resize-none" />
               </div>

               <div className="pt-10 border-t border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                       <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Neural Key Management</h4>
                       <p className="text-[8px] text-gray-500 uppercase tracking-widest">Manage your Gemini API authentication</p>
                     </div>
                     <button 
                       onClick={async () => { if (window.aistudio) await window.aistudio.openSelectKey(); }}
                       className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                     >
                       Update API Key
                     </button>
                  </div>
                  <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex items-center gap-4">
                     <i className="fas fa-info-circle text-amber-500"></i>
                     <p className="text-[9px] text-amber-500/80 font-bold uppercase leading-relaxed">
                       Using advanced preview models requires a paid Gemini API key. 
                       <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline ml-2 hover:text-amber-400">View Billing Documentation</a>
                     </p>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 border-t border-white/5 bg-black/40 text-center flex-shrink-0">
          <button onClick={onClose} className="w-full py-4 md:py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs">Commit Neural Link Changes</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;