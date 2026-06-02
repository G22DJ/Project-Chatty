import React, { useState, useEffect } from 'react';
import { UserPreferences, MemoryEntry } from '../types';

interface DiagnosticTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName: string;
  onAddMemory: (fact: string) => void;
  username: string;
}

export const DiagnosticTerminal: React.FC<DiagnosticTerminalProps> = ({
  isOpen,
  onClose,
  assistantName,
  onAddMemory,
  username,
}) => {
  const [activeTab, setActiveTab] = useState<'rescue' | 'ram' | 'cron' | 'sos'>('rescue');
  
  // Rescue state
  const [quickActionText, setQuickActionText] = useState<string | null>(null);

  // RAM state
  const [brainDump, setBrainDump] = useState('');
  const [flushMsg, setFlushMsg] = useState<string | null>(null);

  // Cron state (Routine Checklists)
  const [routines, setRoutines] = useState<{ id: string; text: string; checked: boolean }[]>([
    { id: 'sunlight', text: 'Morning sunlight (Bypass Olexar fog)', checked: false },
    { id: 'buffer', text: '5-min buffer between context switches', checked: false },
    { id: 'dump', text: 'Nightly task dump to paper', checked: false },
  ]);

  // SOS state
  const [pacerActive, setPacerActive] = useState(false);
  const [groundingActive, setGroundingActive] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);

  // Grounding state machine
  const [currentStage, setCurrentStage] = useState(5);
  const [tapsLeft, setTapsLeft] = useState(5);
  const [groundingComplete, setGroundingComplete] = useState(false);

  const prompts: Record<number, string> = {
    5: "things you can SEE",
    4: "things you can physically FEEL/TOUCH",
    3: "things you can HEAR",
    2: "things you can SMELL (or your favorite smells)",
    1: "good thing about yourself"
  };

  // Load routines from localStorage
  useEffect(() => {
    if (username) {
      try {
        const stored = localStorage.getItem(`nova_${username}_diagnostic_routines`);
        if (stored) {
          setRoutines(JSON.parse(stored));
        }
      } catch (e) {
        console.warn("Could not load routines", e);
      }
    }
  }, [username]);

  // Persist routines
  const handleToggleRoutine = (id: string) => {
    const updated = routines.map(r => r.id === id ? { ...r, checked: !r.checked } : r);
    setRoutines(updated);
    if (username) {
      localStorage.setItem(`nova_${username}_diagnostic_routines`, JSON.stringify(updated));
    }
  };

  if (!isOpen) return null;

  const handleRescueClick = (action: string) => {
    setQuickActionText(action);
  };

  // RAM Flush
  const handleFlushRam = (delegateToAI = false) => {
    if (!brainDump.trim()) return;

    if (delegateToAI) {
      // Structure the memory dump to save into assistant's key facts
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      onAddMemory(`User offloaded working memory at ${timestamp}: "${brainDump.trim()}"`);
      setFlushMsg(`> Memory offloaded and delegated to ${assistantName}'s core memory matrix.`);
    } else {
      setFlushMsg(`> Working cache cleared. System memory successfully wiped.`);
    }

    setBrainDump('');
    setTimeout(() => setFlushMsg(null), 5000);
  };

  // Grounding Tap action
  const handleGroundingTap = () => {
    if (tapsLeft > 1) {
      setTapsLeft(tapsLeft - 1);
    } else {
      // Progress to next stage
      const nextStage = currentStage - 1;
      if (nextStage <= 0) {
        setGroundingComplete(true);
      } else {
        setCurrentStage(nextStage);
        setTapsLeft(nextStage);
      }
    }
  };

  const resetGrounding = () => {
    setCurrentStage(5);
    setTapsLeft(5);
    setGroundingComplete(false);
  };

  return (
    <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-8 animate-fade-in font-mono text-[#c9d1d9]">
      {/* Dynamic Keyframes injection for Breathing Pacer and CRT effect */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes terminalBreathe {
          0% { transform: scale(1); opacity: 0.4; box-shadow: 0 0 10px rgba(88,166,255,0.2); }
          40% { transform: scale(1.8); opacity: 1; box-shadow: 0 0 30px rgba(88,166,255,0.6); }
          50% { transform: scale(1.8); opacity: 1; box-shadow: 0 0 30px rgba(88,166,255,0.6); }
          100% { transform: scale(1); opacity: 0.4; box-shadow: 0 0 10px rgba(88,166,255,0.2); }
        }
        .breathe-pacer-node {
          animation: terminalBreathe 10s infinite ease-in-out;
        }
        .glitch-terminal-border::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          z-index: 100;
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
        }
      `}} />

      <div className="w-full max-w-2xl bg-[#0d1117] border border-[#30363d] rounded-2xl relative flex flex-col h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden glitch-terminal-border">
        
        {/* Terminal Header Bar */}
        <div className="bg-[#161b22] border-b border-[#30363d] p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Windows Control Decors */}
            <div className="w-3 h-3 rounded-full bg-[#f85149] opacity-70"></div>
            <div className="w-3 h-3 rounded-full bg-[#d29922] opacity-70"></div>
            <div className="w-3 h-3 rounded-full bg-[#2ea043] opacity-70"></div>
            <span className="text-xs text-gray-500 font-bold ml-2">CNS_DIAGNOSTIC_TERMINAL_v1.0.9</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors duration-200"
            title="Disconnect Terminal Link"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Diagnostic Status Box */}
        <div className="bg-[#161b22]/50 px-6 py-3 border-b border-[#30363d] flex flex-wrap items-center justify-between text-xs font-bold tracking-wider text-gray-400 gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#2ea043] animate-pulse"></span>
            <span>SYSTEM LINK: ACTIVE</span>
          </div>
          <div>PACER RATE: 5.5s CYC</div>
          <div>MATRIX: SAFE_MODE</div>
        </div>

        {/* Monospace Quick Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-[#30363d] bg-[#0d1117] text-center flex-shrink-0">
          <button
            onClick={() => { setActiveTab('rescue'); setQuickActionText(null); }}
            className={`py-3 px-1 text-[10px] md:text-xs font-bold uppercase transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'rescue' ? 'bg-[#21262d] text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-gray-500 hover:text-[#c9d1d9]'
            }`}
          >
            <i className="fas fa-ambulance"></i> 1. Quick Fix
          </button>
          
          <button
            onClick={() => { setActiveTab('ram'); setFlushMsg(null); }}
            className={`py-3 px-1 text-[10px] md:text-xs font-bold uppercase transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'ram' ? 'bg-[#21262d] text-[#2ea043] border-b-2 border-[#2ea043]' : 'text-gray-500 hover:text-[#c9d1d9]'
            }`}
          >
            <i className="fas fa-microchip"></i> 2. Flush RAM
          </button>
          
          <button
            onClick={() => setActiveTab('cron')}
            className={`py-3 px-1 text-[10px] md:text-xs font-bold uppercase transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'cron' ? 'bg-[#21262d] text-[#d29922] border-b-2 border-[#d29922]' : 'text-gray-500 hover:text-[#c9d1d9]'
            }`}
          >
            <i className="fas fa-history"></i> 3. Routines
          </button>
          
          <button
            onClick={() => setActiveTab('sos')}
            className={`py-3 px-1 text-[10px] md:text-xs font-bold uppercase transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-l border-[#30363d] ${
              activeTab === 'sos' ? 'bg-[#1f1515] text-[#f85149] border-b-2 border-[#f85149]' : 'text-[#f85149]/60 hover:text-[#f85149]'
            }`}
          >
            <i className="fas fa-biohazard"></i> ⚠ SOS OVERRIDE
          </button>
        </div>

        {/* Active Module Window */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-[#0d1117] relative">
          
          {/* TAB 1: RESCUE */}
          {activeTab === 'rescue' && (
            <div className="space-y-4 animate-fade-in text-sm leading-relaxed">
              <h2 className="text-sm font-black text-[#58a6ff] uppercase tracking-widest border-l-4 border-[#58a6ff] pl-3 mb-4">
                CNS OVERLOAD: HOW IS THE ORGANISM RESPONDING?
              </h2>
              
              <p className="text-gray-400 text-xs mb-4">Select the closest symptom pathway to offload or re-anchor processing.</p>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setActiveTab('sos');
                    setGroundingActive(true);
                  }}
                  className="w-full text-left bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] border-l-4 border-l-[#f85149] p-4 rounded-lg flex flex-col gap-1 transition-all active:scale-[0.99]"
                >
                  <strong className="text-[#f85149] text-xs uppercase tracking-wide">&gt; Sensory Overload / Emotional Meltdown</strong>
                  <span className="text-xs text-gray-400 leading-normal">Too much ambient noise, environmental inputs or racing panic cycle. Chest is tight. Immediate override needed.</span>
                </button>

                <button 
                  onClick={() => handleRescueClick("🧊 SENSORY SHOCK ACTION:\n\n1. Stop what you are doing immediately.\n2. Stand up.\n3. Make your way to the nearest basin/bathroom.\n4. Turn tap to coldest setting and splash freezing water on your face.\n5. This triggers the mammalian dive reflex to forcibly throttle your heart rate and reset the autonomic panic cycle.")}
                  className="w-full text-left bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] border-l-4 border-l-[#58a6ff] p-4 rounded-lg flex flex-col gap-1 transition-all active:scale-[0.99]"
                >
                  <strong className="text-[#58a6ff] text-xs uppercase tracking-wide">&gt; System Hanging / Executive Shutdown</strong>
                  <span className="text-xs text-gray-400 leading-normal">Sluggish executive functions, heavy mental fog, tasks feel like massive walls. Feeling sluggish/immobilized.</span>
                </button>

                <button 
                  onClick={() => handleRescueClick("☕ COGNITIVE SHIFT SYSTEM:\n\n1. Close any screens in front of you.\n2. Shift your physical environment (e.g. go out onto a balcony, garden, or next room) for 3 minutes.\n3. Grab a cold glass of water or hot tea.\n4. Complete a physical stretch to signal to your neural matrix that context switching has initiated.")}
                  className="w-full text-left bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] border-l-4 border-l-[#d29922] p-4 rounded-lg flex flex-col gap-1 transition-all active:scale-[0.99]"
                >
                  <strong className="text-[#d29922] text-xs uppercase tracking-wide">&gt; Hyperfocus Tunneling / looping trap</strong>
                  <span className="text-xs text-gray-400 leading-normal">Stuck on a minor bug/detail, time blindness activated, neglecting physical needs (hunger, posture, hydration).</span>
                </button>
              </div>

              {quickActionText && (
                <div className="p-4 border border-[#30363d] border-dashed rounded-lg bg-[#161b22] text-sm text-[#58a6ff] whitespace-pre-line leading-relaxed font-bold animate-slide-up-reveal mt-4">
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 font-bold uppercase">
                    <i className="fas fa-clipboard-check"></i> Active Terminal Directives
                  </div>
                  {quickActionText}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RAM FLUSH */}
          {activeTab === 'ram' && (
            <div className="space-y-4 animate-fade-in text-sm leading-relaxed">
              <h2 className="text-sm font-black text-[#2ea043] uppercase tracking-widest border-l-4 border-[#2ea043] pl-3 mb-4">
                PROCESS OVERLOAD: OFFLOAD WORKLOAD FROM CACHE
              </h2>
              
              <p className="text-gray-400 text-xs">
                Dump all active system noise, tasks, pending emails, loops, and loose threads. Don't worry about spelling, punctuation, or format. Dump it and get it out of working memory.
              </p>

              <div className="space-y-3">
                <textarea 
                  value={brainDump}
                  onChange={(e) => setBrainDump(e.target.value)}
                  placeholder="[System Noise Input Buffer] Type everything clogging your memory threads..."
                  className="w-full h-36 bg-[#0d1117] text-white border border-[#30363d] hover:border-gray-600 focus:border-[#2ea043] rounded-lg p-4 font-mono text-xs focus:ring-1 focus:ring-[#2ea043] focus:outline-none"
                />
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => handleFlushRam(false)}
                    disabled={!brainDump.trim()}
                    className="flex-1 bg-[#21262d] text-[#c9d1d9] border border-[#30363d] hover:bg-[#30363d] active:scale-95 disabled:opacity-40 disabled:hover:bg-[#21262d] py-3.5 px-4 rounded-lg text-xs font-bold uppercase transition-all tracking-wider text-center"
                  >
                    Wipe Working Cache
                  </button>

                  <button 
                    onClick={() => handleFlushRam(true)}
                    disabled={!brainDump.trim()}
                    className="flex-1 bg-[#2ea043] hover:bg-[#3fb950] text-white font-bold active:scale-95 disabled:opacity-40 disabled:hover:bg-[#2ea043] py-3.5 px-4 rounded-lg text-xs uppercase transition-all tracking-wider text-center shadow-lg shadow-green-900/20"
                  >
                    Delegate to {assistantName}
                  </button>
                </div>
              </div>

              {flushMsg && (
                <div className="p-4 border border-[#2ea043]/35 rounded-lg bg-[#0d1f14] text-[#2ea043] text-xs font-bold animate-slide-up-reveal">
                  <i className="fas fa-check-circle mr-2"></i> {flushMsg}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DAILY ROUTINES */}
          {activeTab === 'cron' && (
            <div className="space-y-4 animate-fade-in text-sm leading-relaxed">
              <h2 className="text-sm font-black text-[#d29922] uppercase tracking-widest border-l-4 border-[#d29922] pl-3 mb-4">
                ANNUAL/DAILY SYSTEM MAINTENANCE CRON DEPLOYED
              </h2>

              <p className="text-gray-400 text-xs">
                Check off critical systemic buffer routines. These acts help anchor dopamine levels and provide buffer against overload.
              </p>

              <div className="space-y-2.5">
                {routines.map((routine) => (
                  <button
                    key={routine.id}
                    onClick={() => handleToggleRoutine(routine.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                      routine.checked 
                        ? 'bg-[#16201b] border-[#2ea043]/40 text-[#2ea043]' 
                        : 'bg-[#161b22] border-[#30363d] text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{routine.text}</span>
                    <i className={`fas ${routine.checked ? 'fa-check-square' : 'fa-square'} text-sm`}></i>
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-gray-500 font-bold border-t border-[#30363d] pt-4 uppercase text-center tracking-wider">
                System routines saved & synchronized to bio-signature matrix.
              </div>
            </div>
          )}

          {/* TAB 4: SOS PROTOCOLS */}
          {activeTab === 'sos' && (
            <div className="space-y-4 animate-fade-in text-sm leading-relaxed">
              <h2 className="text-sm font-black text-[#f85149] uppercase tracking-widest border-l-4 border-l-[#f85149] pl-3 mb-4">
                SYSTEM OVERRIDE PROTOCOLS IN PROGRESS
              </h2>
              
              <p className="text-xs text-gray-400 leading-normal mb-4">
                Autonomic panic override activated. DO NOT try to think logically. Select one active sensory mitigation tool below.
              </p>

              <div className="space-y-3">
                
                {/* 1. Breathing Pacer Button & Container */}
                <div className="border border-[#30363d] rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setPacerActive(!pacerActive)}
                    className={`w-full text-left p-4 font-bold text-xs uppercase flex items-center justify-between transition-all ${
                      pacerActive ? 'bg-[#1f1515] text-[#f85149]' : 'bg-[#161b22] text-gray-300 hover:bg-[#1a2028]'
                    }`}
                  >
                    <span>1. Active Breathing Pacer Link</span>
                    <i className={`fas ${pacerActive ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  </button>

                  {pacerActive && (
                    <div className="p-6 bg-[#000000] border-t border-[#30363d] flex flex-col items-center justify-center gap-6 animate-slide-up-reveal">
                      <p className="text-center text-[#58a6ff] text-xs font-bold tracking-wide leading-relaxed">
                        Match your breath cycle with the expanding beacon.<br />
                        <span className="text-xs font-black uppercase text-green-500">Inhale as it grows. Exhale as it shrinks.</span>
                      </p>
                      
                      {/* Interactive Visual Circle */}
                      <div className="w-44 h-44 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#58a6ff] breathe-pacer-node filter blur-[1px]"></div>
                      </div>

                      <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        CYCLE: 4s INHALE // 1s HOLD // 5s EXHALE
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Grounding Sequence Button & Container */}
                <div className="border border-[#30363d] rounded-lg overflow-hidden">
                  <button 
                    onClick={() => {
                      setGroundingActive(!groundingActive);
                      if (!groundingActive) resetGrounding();
                    }}
                    className={`w-full text-left p-4 font-bold text-xs uppercase flex items-center justify-between transition-all ${
                      groundingActive ? 'bg-[#16201b] text-[#2ea043]' : 'bg-[#161b22] text-gray-300 hover:bg-[#1a2028]'
                    }`}
                  >
                    <span>2. Sensory Grounding Sequence (5-4-3-2-1)</span>
                    <i className={`fas ${groundingActive ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  </button>

                  {groundingActive && (
                    <div className="p-6 bg-[#000000] border-t border-[#30363d] text-center space-y-4 animate-slide-up-reveal">
                      {groundingComplete ? (
                        <div className="space-y-3">
                          <p className="text-[#2ea043] font-black uppercase text-sm animate-pulse tracking-wide font-mono">
                            Sequence Complete. Autonomic Matrix Anchored.
                          </p>
                          <p className="text-xs text-gray-500">
                            Your awareness has successfully re-situated into physical space. Take another deep slow breath.
                          </p>
                          <button 
                            onClick={resetGrounding}
                            className="bg-[#21262d] text-white px-4 py-2 border border-[#30363d] hover:bg-[#30363d] text-[10px] font-bold uppercase rounded-lg"
                          >
                            Re-initialize Anchor Test
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-gray-300 text-xs">
                            Slowly notice and acknowledge individual sensory signals one by one. Click TAP to commit each observation.
                          </p>
                          <p className="text-sm font-black text-[#58a6ff] leading-relaxed">
                            Identify <strong>{currentStage}</strong> {prompts[currentStage]}
                          </p>
                          
                          <div className="flex justify-center py-2">
                            <button 
                              onClick={handleGroundingTap}
                              className="w-20 h-20 rounded-full bg-transparent border-2 border-[#2ea043] text-white hover:bg-[#2ea043]/10 active:scale-90 flex items-center justify-center text-xs font-black uppercase tracking-wider select-none transition-all cursor-pointer shadow-[0_0_15px_rgba(46,160,67,0.15)]"
                            >
                              TAP
                            </button>
                          </div>

                          <p className="text-[10px] font-bold text-[#d29922] uppercase tracking-wider">
                            Observation steps remaining: {tapsLeft}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. South African Emergency Contacts */}
                <div className="border border-[#30363d] rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setEmergencyActive(!emergencyActive)}
                    className={`w-full text-left p-4 font-bold text-xs uppercase flex items-center justify-between transition-all ${
                      emergencyActive ? 'bg-[#291616] text-[#f85149]' : 'bg-[#161b22] text-gray-300 hover:bg-[#1a2028]'
                    }`}
                  >
                    <span>3. Outsource System Load (Crisis Contacts)</span>
                    <i className={`fas ${emergencyActive ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  </button>

                  {emergencyActive && (
                    <div className="p-4 bg-[#1f1515]/30 border-t border-[#30363d] text-xs space-y-4 animate-slide-up-reveal">
                      <p className="text-[#f85149] font-black uppercase">Crisis Core Backup Services:</p>
                      <p className="text-gray-400 font-sans tracking-normal">
                        When local hardware is unable to clear deadlock logic, loop in external human processing operators:
                      </p>
                      
                      <div className="space-y-3 font-mono">
                        <div className="border-b border-[#30363d]/50 pb-2">
                          <p className="font-bold text-gray-200">SADAG Mental Health Helpline:</p>
                          <a href="tel:0800567567" className="text-[#58a6ff] hover:underline font-bold tracking-wider text-sm select-auto">
                            0800 567 567
                          </a>
                        </div>

                        <div className="border-b border-[#30363d]/50 pb-2">
                          <p className="font-bold text-gray-200">Suicide Crisis Intervention Line:</p>
                          <a href="tel:0800567567" className="text-[#58a6ff] hover:underline font-bold tracking-wider text-sm select-auto">
                            0800 567 567
                          </a>
                        </div>

                        <div>
                          <p className="font-bold text-gray-200">SAPS General Mobile SOS Rescue:</p>
                          <a href="tel:112" className="text-[#58a6ff] hover:underline font-bold tracking-wider text-sm select-auto">
                            112
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Terminal Status Footer */}
        <div className="bg-[#161b22] border-t border-[#30363d] p-4 text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider flex-shrink-0">
          Neural link monitoring console. Safe diagnostics activated.
        </div>

      </div>
    </div>
  );
};
