export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'local' | 'google';
  plan: 'free' | 'pro' | 'enterprise';
  preferences?: {
    theme?: string;
    defaultModel?: string;
    systemInstruction?: string;
  };
  usage?: {
    totalTokens: number;
    totalRequests: number;
    lastActive: string;
  };
  createdAt?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  imageUrl?: string;
  fileName?: string;
  fileType?: string;
  isReasoning?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
  userId?: string | null;
  model?: string;
}

export interface SuggestionPrompt {
  id: string;
  icon: 'code' | 'trip' | 'brainstorm' | 'globe' | 'sparkles';
  title: string;
  prompt: string;
  subtitle: string;
}

export interface AiModelInfo {
  modelId: string;
  displayName: string;
  tag: string;
  badge: string;
  description: string;
  provider: string;
  contextWindow: string;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsVoice: boolean;
  supportsReasoning: boolean;
  isProOnly: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  user?: UserProfile;
}

export type PersonaType = 'general' | 'coder' | 'kerala_scholar' | 'malayalam_writer' | 'math_tutor';

export interface PersonaInfo {
  id: PersonaType;
  name: string;
  description: string;
  icon: string;
  badge?: string;
}

