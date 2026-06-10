import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';

interface VrmAvatarViewerProps {
  modelUrl?: string;
  isSpeaking: boolean;
  themeColor: string;
  analyser: AnalyserNode | null;
  onModelLoaded?: (name: string) => void;
  onModelError?: (error: string) => void;
}

const PRESET_MODELS = [
  {
    name: "Cyber Agent (Default)",
    url: "https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/three-vrm-girl.vrm",
    desc: "Standard official VRM 1.0 agent blueprint."
  }
];

export const VrmAvatarViewer: React.FC<VrmAvatarViewerProps> = ({
  modelUrl,
  isSpeaking,
  themeColor,
  analyser,
  onModelLoaded,
  onModelError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>(
    modelUrl || PRESET_MODELS[0].url
  );

  // Gaze target / head tracking using refs to prevent React thrashes on mousemove
  const mousePosRef = useRef({ x: 0, y: 0 });
  const [dragProgress, setDragProgress] = useState(0);

  // Settings
  const [showConfig, setShowConfig] = useState(false);
  const [showVmcPanel, setShowVmcPanel] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // VMC State and Connection
  const [vmcUrl, setVmcUrl] = useState('ws://127.0.0.1:39539');
  const [vmcState, setVmcState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [vmcHz, setVmcHz] = useState(0);

  // VMC Settings Options
  const [applyRotations, setApplyRotations] = useState(true);
  const [applyPositions, setApplyPositions] = useState(true);
  const [applyBlends, setApplyBlends] = useState(true);
  const [mirrorX, setMirrorX] = useState(false);

  // Refs for tracking VMC values safely
  const vmcBonesRef = useRef<Map<string, { pos?: [number, number, number]; rot?: [number, number, number, number] }>>(new Map());
  const vmcBlendsRef = useRef<Map<string, number>>(new Map());
  const vmcWsRef = useRef<WebSocket | null>(null);
  const vmcHzIntervalRef = useRef<any>(null);
  const messageCountRef = useRef(0);
  
  // Keep live copies of the toggles so the animation frame loop reads them instantly without stale closure problems
  const vmcOptsRef = useRef({
    connected: false,
    applyRotations: true,
    applyPositions: true,
    applyBlends: true,
    mirrorX: false
  });

  useEffect(() => {
    vmcOptsRef.current = {
      connected: vmcState === 'connected',
      applyRotations,
      applyPositions,
      applyBlends,
      mirrorX
    };
  }, [vmcState, applyRotations, applyPositions, applyBlends, mirrorX]);

  const disconnectVmc = () => {
    if (vmcWsRef.current) {
      try {
        vmcWsRef.current.close();
      } catch (err) {}
      vmcWsRef.current = null;
    }
    if (vmcHzIntervalRef.current) {
      clearInterval(vmcHzIntervalRef.current);
      vmcHzIntervalRef.current = null;
    }
    setVmcState('disconnected');
    setVmcHz(0);
    messageCountRef.current = 0;
  };

  const connectVmc = () => {
    disconnectVmc();
    
    setVmcState('connecting');
    try {
      const ws = new WebSocket(vmcUrl);
      vmcWsRef.current = ws;

      ws.onopen = () => {
        setVmcState('connected');
        messageCountRef.current = 0;
        
        // Start Hz calculation interval
        vmcHzIntervalRef.current = setInterval(() => {
          setVmcHz(messageCountRef.current);
          messageCountRef.current = 0;
        }, 1000);
      };

      ws.onmessage = (event) => {
        messageCountRef.current++;
        try {
          let data = JSON.parse(event.data);
          let address = '';
          let args: any[] = [];
          
          if (Array.isArray(data)) {
            address = data[0];
            args = data.slice(1);
          } else if (data && typeof data === 'object') {
            address = data.address || data.Address || data.msg || '';
            args = data.args || data.Args || data.data || [];
          }

          if (address === '/vmc/ext/bone/pos') {
            const [boneName, px, py, pz, qx, qy, qz, qw] = args;
            if (typeof boneName === 'string') {
              vmcBonesRef.current.set(boneName, {
                pos: [px, py, pz],
                rot: [qx, qy, qz, qw]
              });
            }
          } else if (address === '/vmc/ext/blend/val') {
            const [blendName, val] = args;
            if (typeof blendName === 'string' && typeof val === 'number') {
              vmcBlendsRef.current.set(blendName, val);
            }
          } else if (address === '/vmc/ext/root/pos') {
            const [rootName, px, py, pz, qx, qy, qz, qw] = args;
            if (typeof rootName === 'string') {
              vmcBonesRef.current.set('root', {
                pos: [px, py, pz],
                rot: [qx, qy, qz, qw]
              });
            }
          }
        } catch (e) {
          // Ignore parse errors if binary/non-JSON data
        }
      };

      ws.onerror = (e) => {
        console.error("VMC WS Error:", e);
        setVmcState('error');
      };

      ws.onclose = () => {
        setVmcState((prev) => (prev === 'connecting' || prev === 'error' ? 'error' : 'disconnected'));
        if (vmcHzIntervalRef.current) {
          clearInterval(vmcHzIntervalRef.current);
          vmcHzIntervalRef.current = null;
        }
        setVmcHz(0);
      };
    } catch (err) {
      console.error("VMC connection error:", err);
      setVmcState('error');
    }
  };

  // Ensure unmount safety
  useEffect(() => {
    return () => {
      if (vmcWsRef.current) {
        try {
          vmcWsRef.current.close();
        } catch (err) {}
      }
      if (vmcHzIntervalRef.current) {
        clearInterval(vmcHzIntervalRef.current);
      }
    };
  }, []);

  // State refs to prevent model reloading / teardown when speaking state toggled
  const isSpeakingRef = useRef(isSpeaking);
  const themeColorRef = useRef(themeColor);
  const analyserRef = useRef(analyser);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    themeColorRef.current = themeColor;
  }, [themeColor]);

  useEffect(() => {
    analyserRef.current = analyser;
  }, [analyser]);

  // Update current URL if external modelUrl overrides it
  useEffect(() => {
    if (modelUrl) {
      setCurrentUrl(modelUrl);
    }
  }, [modelUrl]);

  // Main Three.js setup
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let clock: THREE.Clock;
    let animationFrameId: number;
    let resizeObserver: ResizeObserver;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 1. Scene, Camera, Renderer
    scene = new THREE.Scene();
    scene.background = null; // Transparent canvas background to slide over the app background

    camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / container.clientHeight,
      0.1,
      20
    );
    camera.position.set(0, 1.4, 1.5); // Default framing

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 2. OrbitControls with limits so user doesn't get lost
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.3, 0); // initial focus
    controls.enableZoom = true; // Enable zoom effect as requested
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.4;
    controls.maxDistance = 5.0;
    controls.minPolarAngle = Math.PI / 4; // Allow looking slightly more from below/above
    controls.maxPolarAngle = Math.PI / 1.7;
    controls.update();

    // 3. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(1, 3, 2);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Rim light reflecting current theme color (dynamic via animation ticks)
    const rimLight = new THREE.DirectionalLight(new THREE.Color(themeColorRef.current || '#3b82f6'), 1.8);
    rimLight.position.set(-2, 2, -1);
    scene.add(rimLight);

    // Subtle blue fill light from below for visual depth
    const fillLight = new THREE.DirectionalLight(0x4f46e5, 0.4);
    fillLight.position.set(0, -1, 1);
    scene.add(fillLight);

    clock = new THREE.Clock();

    // 4. VRM Loading
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    setLoading(true);
    setLoadError(null);

    loader.load(
      currentUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          setLoadError("Asset loading succeeded but no VRM structure was parsed.");
          setLoading(false);
          return;
        }

        vrmRef.current = vrm;
        scene.add(vrm.scene);

        // Turn the character around 180 deg to face the camera
        vrm.scene.rotation.y = Math.PI;

        // Strip default lighting and enforce beautiful dynamic model shadows
        vrm.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            // Retain material quality in sRGB colorspace
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => {
                  if ((mat as any).map) (mat as any).map.colorSpace = THREE.SRGBColorSpace;
                });
              } else {
                if ((obj.material as any).map) (obj.material as any).map.colorSpace = THREE.SRGBColorSpace;
              }
            }
          }
        });

        // Autoframe: Determine head height of the current avatar dynamically and center camera
        vrm.scene.updateMatrixWorld(true);
        const headNode = vrm.humanoid?.getNormalizedBoneNode('head') || vrm.humanoid?.getRawBoneNode('head');
        let headHeight = 1.45;
        if (headNode) {
          const headWorldPos = new THREE.Vector3();
          headNode.getWorldPosition(headWorldPos);
          if (headWorldPos.y > 0.2) {
            headHeight = headWorldPos.y;
          }
        } else {
          // Bounding box fallback for generic or custom non-standard characters
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const size = new THREE.Vector3();
          box.getSize(size);
          if (size.y > 0.2) {
            headHeight = size.y * 0.85;
          }
        }

        // Beautiful default crop centered exactly at the face
        controls.target.set(0, headHeight - 0.05, 0);
        camera.position.set(0, headHeight, 1.1); // Slightly closer and clean frame
        controls.update();

        // Autodetect gaze/lookAt target setting if exists
        if (vrm.lookAt) {
          vrm.lookAt.target = null;
        }

        setLoading(false);
        if (onModelLoaded) {
          onModelLoaded(currentUrl);
        }
      },
      (progress) => {
        if (progress.total > 0) {
          const prog = (progress.loaded / progress.total) * 100;
          setDragProgress(Math.round(prog));
        }
      },
      (err) => {
        console.error("VRM load error:", err);
        setLoadError("Failed to download or boot this VRM model asset.");
        setLoading(false);
        if (onModelError) onModelError(String(err));
      }
    );

    // 5. Responsive Resize Handler (ResizeObserver)
    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Check to avoid empty/collapsed elements causing division by zero
        if (width > 0 && height > 0) {
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(container);

    // 6. Interactive Mouse Tracker using local client Rect calculations
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mousePosRef.current = { x, y };
    };
    container.addEventListener('mousemove', handleMouseMove);

    // 7. Animation State Keepers
    let lastBlinkTime = 0;
    let blinkDuration = 0.15; // 150ms blink
    let isBlinking = false;
    let nextBlinkInterval = 3 + Math.random() * 4; // seconds

    // 8. Animation/Render Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Dynamic rim color matching current theme (no reload needed!)
      if (rimLight) {
        rimLight.color.set(themeColorRef.current || '#3b82f6');
      }

      // If VRM model is active, manipulate bones and expressions
      if (vrmRef.current) {
        const vrm = vrmRef.current;

        // Update spring bone physics & update
        vrm.update(deltaTime);

        const vmcOpts = vmcOptsRef.current;
        if (vmcOpts.connected) {
          // --- VMC ACTIVE RENDERING AND ROTATIONS ---
          if (vmcOpts.applyRotations) {
            vmcBonesRef.current.forEach((boneData, boneName) => {
              if (!boneData.rot) return;
              
              let vrmBoneName = boneName;
              if (boneName.length > 0) {
                // Map Upper CamelCase (from standard Unity VMC) to CamelCase (vrm standard)
                vrmBoneName = boneName.charAt(0).toLowerCase() + boneName.slice(1);
              }

              const boneNode = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName as any) || vrm.humanoid?.getRawBoneNode(vrmBoneName as any);
              if (boneNode) {
                const [qx, qy, qz, qw] = boneData.rot;
                if (vmcOpts.mirrorX) {
                  boneNode.quaternion.set(qx, -qy, -qz, qw);
                } else {
                  boneNode.quaternion.set(-qx, qy, -qz, qw);
                }
              }
            });
          }

          // Apply root/hips offsets
          if (vmcOpts.applyPositions) {
            const hipsData = vmcBonesRef.current.get('Hips') || vmcBonesRef.current.get('hips');
            if (hipsData && hipsData.pos) {
              const hipsNode = vrm.humanoid?.getNormalizedBoneNode('hips') || vrm.humanoid?.getRawBoneNode('hips');
              if (hipsNode) {
                const [px, py, pz] = hipsData.pos;
                if (vmcOpts.mirrorX) {
                  hipsNode.position.set(px, py, pz);
                } else {
                  hipsNode.position.set(-px, py, pz);
                }
              }
            }
          }

          // Apply blendshapes
          if (vmcOpts.applyBlends) {
            const currentExpManager = vrm.expressionManager;
            const currentBSSystem = (vrm as any).blendShapeProxy;

            vmcBlendsRef.current.forEach((val, blendName) => {
              let key = blendName.toLowerCase();
              if (key === 'a' || key === 'aa') key = 'aa';
              if (key === 'i' || key === 'ih') key = 'ih';
              if (key === 'u' || key === 'ou') key = 'ou';
              if (key === 'e' || key === 'ee') key = 'ee';
              if (key === 'o' || key === 'oh') key = 'oh';

              if (currentExpManager) {
                currentExpManager.setValue(key as any, val);
              } else if (currentBSSystem) {
                currentBSSystem.setValue(blendName as any, val);
              }
            });
          }
        } else {
          // --- STANDARD PROCEDURAL IDLE AND MOUSE COUPLING ---
          // A. Breathing animation (idle micro-movement)
          const spine = vrm.humanoid?.getNormalizedBoneNode('spine') || vrm.humanoid?.getRawBoneNode('spine');
          if (spine) {
            spine.rotation.z = Math.sin(elapsedTime * 1.5) * 0.01;
            spine.rotation.x = Math.sin(elapsedTime * 1.0) * 0.008;
          }

          const chest = vrm.humanoid?.getNormalizedBoneNode('chest') || vrm.humanoid?.getRawBoneNode('chest');
          if (chest) {
            chest.rotation.z = Math.sin(elapsedTime * 1.3) * 0.006;
            chest.rotation.x = Math.sin(elapsedTime * 1.1) * 0.005;
          }

          // B. Natural Arm Resting Pose (A-Pose instead of rigid T-Pose)
          const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm') || vrm.humanoid?.getRawBoneNode('leftUpperArm');
          if (leftUpperArm) {
            leftUpperArm.rotation.z = -1.2; // Rotate arm down toward hips (approx -70 degrees)
            leftUpperArm.rotation.x = 0.15; // Slightly forward for a natural standing position
            leftUpperArm.rotation.y = 0.05;
          }

          const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm') || vrm.humanoid?.getRawBoneNode('rightUpperArm');
          if (rightUpperArm) {
            rightUpperArm.rotation.z = 1.2;  // Rotate arm down toward hips (approx +70 degrees)
            rightUpperArm.rotation.x = 0.15; // Slightly forward for a natural standing position
            rightUpperArm.rotation.y = -0.05;
          }

          // Add a micro-bend to the elbows to keep them relaxed rather than hyper-extended
          const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm') || vrm.humanoid?.getRawBoneNode('leftLowerArm');
          if (leftLowerArm) {
            leftLowerArm.rotation.y = -0.15;
          }

          const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm') || vrm.humanoid?.getRawBoneNode('rightLowerArm');
          if (rightLowerArm) {
            rightLowerArm.rotation.y = 0.15;
          }

          // C. Mouse interaction (Look-At movement)
          const head = vrm.humanoid?.getNormalizedBoneNode('head') || vrm.humanoid?.getRawBoneNode('head');
          const neck = vrm.humanoid?.getNormalizedBoneNode('neck') || vrm.humanoid?.getRawBoneNode('neck');

          const targetHeadYaw = mousePosRef.current.x * 0.4; // 0.4 radian max
          const targetHeadPitch = -mousePosRef.current.y * 0.2; // 0.2 radian max

          if (head) {
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadYaw, 0.1);
            head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetHeadPitch, 0.1);
          }
          if (neck) {
            neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, targetHeadYaw * 0.4, 0.1);
            neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, targetHeadPitch * 0.4, 0.1);
          }
        }

        // --- PROC SPEECH & BLINK (Overlay fallback if VMC doesn't send expression blends) ---
        const currentExpManager = vrm.expressionManager;
        const currentBSSystem = (vrm as any).blendShapeProxy;

        const hasVmcBlends = vmcOpts.connected && vmcOpts.applyBlends && vmcBlendsRef.current.size > 0;
        
        if (!hasVmcBlends) {
          let aaValue = 0;
          let ohValue = 0;

          if (isSpeakingRef.current) {
            const currentAnalyser = analyserRef.current;
            if (currentAnalyser) {
              // Read active spectrum levels from analyzer
              const freqData = new Uint8Array(currentAnalyser.frequencyBinCount);
              currentAnalyser.getByteFrequencyData(freqData);
              
              // Average mic amplitude to scale vowels
              let sum = 0;
              for (let i = 0; i < freqData.length; i++) {
                sum += freqData[i];
              }
              const avgAmplitude = sum / freqData.length;
              const volumeMultiplier = Math.min(avgAmplitude / 70, 1.0); // Normalize to 0-1 range

              // Shift between vowel presets using modulated time
              aaValue = volumeMultiplier * (0.6 + 0.4 * Math.sin(elapsedTime * 20));
              ohValue = volumeMultiplier * (0.3 + 0.3 * Math.cos(elapsedTime * 14));
            } else {
              // Fallback: procedural sine wave lip-sync
              const speechVolume = 0.7 + 0.3 * Math.sin(elapsedTime * 15);
              aaValue = Math.max(0, Math.sin(elapsedTime * 20)) * speechVolume;
              ohValue = Math.max(0, Math.cos(elapsedTime * 12)) * (1.0 - aaValue) * 0.4;
            }
          }

          if (currentExpManager) {
            currentExpManager.setValue('aa', aaValue);
            currentExpManager.setValue('oh', ohValue);
          } else if (currentBSSystem) {
            currentBSSystem.setValue('A', aaValue);
            currentBSSystem.setValue('O', ohValue);
          }

          // D. Random Blinking Mechanism
          const curTime = elapsedTime;
          if (!isBlinking && curTime - lastBlinkTime > nextBlinkInterval) {
            isBlinking = true;
            lastBlinkTime = curTime;
          }

          if (isBlinking) {
            const blinkProgress = (curTime - lastBlinkTime) / blinkDuration;
            if (blinkProgress >= 1.0) {
              isBlinking = false;
              nextBlinkInterval = 3 + Math.random() * 5; // schedule next blink
              if (currentExpManager) {
                currentExpManager.setValue('blink', 0);
              } else if (currentBSSystem) {
                currentBSSystem.setValue('Blink', 0);
              }
            } else {
              // Triangular wave function for blink loop: 0 -> 1 -> 0
              const blinkVal = Math.sin(blinkProgress * Math.PI);
              if (currentExpManager) {
                currentExpManager.setValue('blink', blinkVal);
              } else if (currentBSSystem) {
                currentBSSystem.setValue('Blink', blinkVal);
              }
            }
          }
        }

        // Commit expression updates
        if (currentExpManager) {
          currentExpManager.update();
        } else if (currentBSSystem) {
          currentBSSystem.update();
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 9. Clean up on component unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);

      // Recursive hardware cleanup to prevent standard memory leaks
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        object.geometry.dispose();

        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      });

      controls.dispose();
      renderer.dispose();
      vrmRef.current = null;
    };
  }, [currentUrl]);

  // Drag & drop handlers for local VRM file uploads
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.vrm')) {
      loadVrmFile(file);
    } else {
      setLoadError("Invalid asset format. Please drop a valid '.vrm' avatar file.");
    }
  };

  const loadVrmFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setCurrentUrl(objectUrl);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.vrm')) {
      loadVrmFile(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      setCurrentUrl(customUrlInput.trim());
      setShowConfig(false);
    }
  };

  return (
    <div 
      className="relative flex-1 h-full w-full flex flex-col justify-between"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={containerRef}
    >
      {/* 3D Model Rendering Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-10" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-20 gap-4">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin"></div>
            <i className="fas fa-cube text-2xl text-blue-400 animate-pulse"></i>
          </div>
          <span className="font-mono text-xs text-blue-400 uppercase tracking-widest animate-pulse">
            Synthesizing 3D Rig ({dragProgress}%)
          </span>
        </div>
      )}

      {/* Error display */}
      {loadError && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 text-xl animate-bounce">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h4 className="font-black text-white uppercase tracking-wider text-sm">Rigging System Alert</h4>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs">{loadError}</p>
          <button 
            onClick={() => {
              setCurrentUrl(PRESET_MODELS[0].url);
              setLoadError(null);
            }} 
            className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase hover:bg-white/20 transition-all active:scale-95"
          >
            Reset Default Model
          </button>
        </div>
      )}

      {/* Controls Overlay Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-30 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => {
              setShowConfig(!showConfig);
              setShowVmcPanel(false);
            }}
            className={`w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-90 ${showConfig ? 'text-blue-400 border-blue-500/50 bg-blue-500/10' : 'text-white hover:bg-white/15'}`}
            title="Model Settings"
          >
            <i className="fas fa-sliders-h text-sm"></i>
          </button>
          <button 
            onClick={() => {
              setShowVmcPanel(!showVmcPanel);
              setShowConfig(false);
            }}
            className={`w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-90 ${showVmcPanel ? 'text-blue-400 border-blue-500/50 bg-blue-500/10' : 'text-white hover:bg-white/15'}`}
            title="VMC Motion Capture Receiver"
          >
            <i className="fas fa-broadcast-tower text-sm"></i>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-all active:scale-90"
            title="Upload Local VRM File"
          >
            <i className="fas fa-upload text-sm"></i>
          </button>
          <button 
            onClick={() => setShowInstructions(true)}
            className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-all active:scale-90"
            title="How to build or get a VRM model"
          >
            <i className="fas fa-question-circle text-sm"></i>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".vrm" 
            className="hidden" 
          />
        </div>

        <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl font-mono text-[9px] text-gray-400 font-bold uppercase tracking-wider">
          {vmcState === 'connected' ? (
            <span className="text-blue-400 animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> VMC Active ({vmcHz}Hz)
            </span>
          ) : isSpeaking ? (
            <span className="text-emerald-400 animate-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Voice Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span> Standby
            </span>
          )}
        </span>
      </div>

      {/* Drag & Drop Prompt Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-xl text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <i className="fas fa-info-circle text-blue-400"></i> Drag & drop .vrm to load!
        </div>
      </div>

      {/* VMC Feed Receiver Control Panel */}
      {showVmcPanel && (
        <div className="absolute inset-x-4 bottom-16 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-40 animate-slide-up-reveal flex flex-col gap-3.5 pointer-events-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${vmcState === 'connected' ? 'bg-emerald-500' : vmcState === 'connecting' ? 'bg-amber-400' : 'bg-blue-500'} animate-pulse`}></span>
              <h5 className="font-black text-white uppercase tracking-wider text-xs">VMC Motion Receiver</h5>
            </div>
            <button 
              onClick={() => setShowVmcPanel(false)} 
              className="text-gray-500 hover:text-white p-1"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="ws://127.0.0.1:39539" 
              value={vmcUrl}
              onChange={(e) => setVmcUrl(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
            {vmcState === 'connected' ? (
              <button 
                onClick={disconnectVmc}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Cut
              </button>
            ) : (
              <button 
                onClick={connectVmc}
                disabled={vmcState === 'connecting'}
                className={`px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:bg-blue-500 ${vmcState === 'connecting' ? 'opacity-50' : ''}`}
              >
                {vmcState === 'connecting' ? 'Linking' : 'Link'}
              </button>
            )}
          </div>

          {/* Connection Stats banner */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5 font-mono text-[10px]">
            <span className="text-gray-500 font-bold">LINK STATUS:</span>
            {vmcState === 'connected' ? (
              <span className="text-emerald-400 font-bold animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> CONNECTED ({vmcHz} Hz)
              </span>
            ) : vmcState === 'connecting' ? (
              <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span> ESTABLISHING...
              </span>
            ) : vmcState === 'error' ? (
              <span className="text-red-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> LINK FAILURE
              </span>
            ) : (
              <span className="text-gray-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span> OFFLINE
              </span>
            )}
          </div>

          {/* Controls Settings */}
          <div className="space-y-2 pt-1 border-t border-white/5">
            <p className="text-[8px] text-gray-500 font-black uppercase tracking-wider">Feed Stream Filters</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setApplyRotations(!applyRotations)}
                className={`flex justify-between items-center px-3 py-2 rounded-xl border text-[9px] font-bold transition-all ${applyRotations ? 'border-blue-500 bg-blue-500/5 text-blue-400' : 'border-white/5 text-gray-400 hover:text-white'}`}
              >
                <span>BONE ROTATIONS</span>
                <i className={`fas ${applyRotations ? 'fa-check text-blue-400' : 'fa-times text-gray-600'}`}></i>
              </button>
              <button
                onClick={() => setApplyPositions(!applyPositions)}
                className={`flex justify-between items-center px-3 py-2 rounded-xl border text-[9px] font-bold transition-all ${applyPositions ? 'border-blue-500 bg-blue-500/5 text-blue-400' : 'border-white/5 text-gray-400 hover:text-white'}`}
              >
                <span>ROOT POSITIONS</span>
                <i className={`fas ${applyPositions ? 'fa-check text-blue-400' : 'fa-times text-gray-600'}`}></i>
              </button>
              <button
                onClick={() => setApplyBlends(!applyBlends)}
                className={`flex justify-between items-center px-3 py-2 rounded-xl border text-[9px] font-bold transition-all ${applyBlends ? 'border-blue-500 bg-blue-500/5 text-blue-400' : 'border-white/5 text-gray-400 hover:text-white'}`}
              >
                <span>BLEND SHAPES</span>
                <i className={`fas ${applyBlends ? 'fa-check text-blue-400' : 'fa-times text-gray-600'}`}></i>
              </button>
              <button
                onClick={() => setMirrorX(!mirrorX)}
                className={`flex justify-between items-center px-3 py-2 rounded-xl border text-[9px] font-bold transition-all ${mirrorX ? 'border-blue-500 bg-blue-500/5 text-blue-400' : 'border-white/5 text-gray-400 hover:text-white'}`}
              >
                <span>MIRROR MOTION</span>
                <i className={`fas ${mirrorX ? 'fa-check text-blue-400' : 'fa-times text-gray-600'}`}></i>
              </button>
            </div>
          </div>

          <p className="text-[8px] text-gray-500 leading-normal">
            Stream raw motion capture vectors directly into this VRM rig from Virtual Motion Capture, VNyan, Warudo, or iFacialMocap over WebSocket protocol.
          </p>
        </div>
      )}

      {/* Configuration Slider Menu */}
      {showConfig && (
        <div className="absolute inset-x-4 bottom-16 bg-black/90 backdrop-blur-lg border border-white/10 rounded-2xl p-4 z-40 animate-slide-up-reveal flex flex-col gap-4 pointer-events-auto">
          <div className="flex justify-between items-center">
            <h5 className="font-black text-white uppercase tracking-wider text-xs">Vrm Asset Uplink</h5>
            <button 
              onClick={() => setShowConfig(false)} 
              className="text-gray-500 hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Paste VRM URL and press Enter..." 
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-500 transition-colors"
            >
              Link
            </button>
          </form>

          <div className="border-t border-white/5 pt-3">
            <p className="text-[9px] text-gray-500 font-black uppercase mb-2">Architectural Presets</p>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_MODELS.map((preset) => (
                <button 
                  key={preset.name}
                  onClick={() => {
                    setCurrentUrl(preset.url);
                    setShowConfig(false);
                  }}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${currentUrl === preset.url ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 bg-white/3 hover:bg-white/5'}`}
                >
                  <span className="text-[10px] text-white font-bold">{preset.name}</span>
                  <span className="text-[8px] text-gray-500 mt-1">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VRM Build Guide Modal Popup */}
      {showInstructions && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 text-center animate-fade-in pointer-events-auto">
          <div className="bg-zinc-950/95 border border-white/10 rounded-2xl p-5 max-w-[280px] xs:max-w-xs w-full relative shadow-2xl flex flex-col gap-3 text-left">
            <button 
              onClick={() => setShowInstructions(false)} 
              className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors p-1"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
            
            <div className="flex items-center gap-2 text-indigo-400">
              <i className="fas fa-graduation-cap text-xs"></i>
              <h4 className="font-mono text-[9px] font-black uppercase tracking-widest">VRM Master-Guide</h4>
            </div>

            <div className="space-y-2.5 text-[11px] leading-relaxed text-gray-400">
              <p className="font-black text-white text-xs leading-snug">
                HI there , do you want to know how to build your VRM model?
              </p>
              
              <p className="font-medium text-gray-300">
                if so , please go to this link{" "}
                <a 
                  href="https://vroid.com/en/studio" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-400 hover:text-blue-300 underline font-bold inline-flex items-center gap-1"
                >
                  vroid.com/en/studio <i className="fas fa-external-link-alt text-[8px]"></i>
                </a>{" "}
                and create your vrm model
              </p>
              
              <p className="border-l-2 border-indigo-500 bg-indigo-500/5 pl-2 py-1 italic rounded-r text-gray-300">
                when finished download it  , be sure to choose <strong className="text-white">VRM version 0.0</strong> as for the newest version wont work on here
              </p>
              
              <p className="text-gray-300">
                and then after building and downloading theyour VRM go to upload vrm option and search for your vrm model
              </p>
              
              <p className="font-black text-pink-400 text-xs">
                and thats that , enjoy ❤
              </p>
            </div>

            <button 
              onClick={() => setShowInstructions(false)} 
              className="mt-1 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[9px] tracking-wider rounded-xl transition-all active:scale-95"
            >
              Acknowledge Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VrmAvatarViewer;
