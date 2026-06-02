

export enum AssistantState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  THINKING = 'THINKING',
  OBSERVING = 'OBSERVING',
  ERROR = 'ERROR'
}

export type DeviceType = 'wear' | 'mobile' | 'desktop' | 'tv' | 'auto';

export type UITheme = 'cosmic' | 'emerald' | 'ruby' | 'obsidian' | 'whatsapp' | 'facebook' | 'telegram' | 'instagram' | 'custom';
export type PersonalityType = 'professional' | 'friendly' | 'witty' | 'minimalist' | 'alluring' | 'custom';
export type BackgroundStyle = 'grid' | 'aurora' | 'noise' | 'solid' | 'image';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SensorData {
  battery?: number;
  charging?: boolean;
  online: boolean;
  platform: string;
  location?: { lat: number; lng: number };
}

export interface TranscriptionEntry {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  isStreaming?: boolean;
  sources?: GroundingSource[];
  imageUrl?: string;
}

export interface MemoryEntry {
  id: string;
  fact: string;
  timestamp: Date;
}

/**
 * Configuration for the AI assistant's visual avatar features.
 */
export interface AvatarConfig {
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  clothingStyle: string;
  environment: string;
  vibe: string;
  aspiration: string;
  traits: string[];
}

export interface UserPreferences {
  theme: UITheme;
  personality: PersonalityType;
  customPersonality?: string;
  layout: 'left' | 'right';
  voiceId: string;
  assistantName: string;
  assistantProfilePic?: string;
  modality: 'masculine' | 'feminine';
  
  // Customization Extensions
  primaryColor: string;
  secondaryColor: string;
  borderRadius: string; 
  fontFamily: 'Inter' | 'Roboto Mono' | 'Outfit' | 'Bebas Neue' | 'System';
  bgStyle: BackgroundStyle;
  bgImage?: string;
  speechSpeed: number; 
  speechPitch: number; 
  greeting: string;

  // New UI Customization Specs
  bubbleRadius?: string;
  userBubbleColor?: string;
  userBubbleTextColor?: string;
  agentBubbleColor?: string;
  agentBubbleTextColor?: string;
  glassOpacity?: number;
  glassBlur?: string;
  showGrid?: boolean;
  showNoise?: boolean;
  headerStyle?: 'default' | 'minimal' | 'floating';

  /**
   * Optional configuration for the AI's generated avatar.
   */
  avatarConfig?: AvatarConfig;
}

export interface AuthUser {
  username: string;
  preferences: UserPreferences;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: Date;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
