export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

export interface SuggestionPrompt {
  id: string;
  icon: 'code' | 'trip' | 'brainstorm';
  title: string;
  prompt: string;
  subtitle: string;
}
