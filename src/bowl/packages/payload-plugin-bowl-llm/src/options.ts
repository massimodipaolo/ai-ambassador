import { translations } from './translations';
import { LlmGroup, LlmOptions, LlmSlug } from './types';

export const defaultSlug: LlmSlug = {
  llmApp: 'llmApp',
  llmTool: 'llmTool',
  llmAppTool: 'llmAppTool',
  llmThread: 'llmThread',
  llmFineTuning: 'llmFineTuning',
  llmRule: 'llmRule',
};

export const defaultGroup: LlmGroup = {
  llm: 'llm',
};

export const options: LlmOptions = {
  group: defaultGroup,
  slug: defaultSlug,
  translations,
};

export const internalSlugs = Object.entries(defaultSlug).map(x => x[1]);
