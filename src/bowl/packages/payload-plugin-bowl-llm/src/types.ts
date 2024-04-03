import { Resource } from 'i18next';

// naming convention in camelCase

export type LlmSlug = {
  llmApp: string;
  llmTool: string;
  llmAppTool: string;
  llmThread: string;
  llmFineTuning: string;
  llmRule: string;
  [key: string]: string;
};

export type LlmGroup = {
  llm: string;
  [key: string]: string;
};

export type LlmOptions = {
  group: LlmGroup;
  slug: LlmSlug;
  translations: Resource;
};

export type LlmInitOptions = {
  group?: Partial<LlmGroup>;
  slug?: Partial<LlmSlug>;
};
