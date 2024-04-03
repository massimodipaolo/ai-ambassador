import { IMedia } from '@websolutespa/bom-core';

export type LlmChunkItem = Record<string, unknown> & { type: string };

export type LlmChunk = string | LlmChunkItem;

export type LlmMessage = {
  role: string;
  content: string;
};

export type LlmDecodedMessage = LlmMessage & {
  chunks: LlmChunkItem[];
};

export type LlmSummary = {
  fullName: string,
  email: string,
  privacy: boolean,
  appId: string,
  threadId: string,
  summaryUrl: string,
  html: string,
};

export type LlmAppReferrer = {
  id: string;
  referrer: string;
};

export type LlmMapReplacedField = {
  srcName: string;
  destName: string;
};

export type LlmMapNewField = {
  name: string;
  value: string;
};

export type LlmMapDeletedField = {
  name: string;
};

export type LlmFieldsMapping = {
  replacedFields: LlmMapReplacedField[];
  newFields: LlmMapNewField[];
  deletedFields: LlmMapDeletedField[];
};

export type LlmKnowledgeBaseEndpoint = {
  endpointUrl: string;
  fieldsMapping: LlmFieldsMapping;
  id: string;
};

export type LlmKnowledgeBaseFile = {
  media: IMedia;
};

export type LlmKnowledgeBase = {
  externalEndpoints: LlmKnowledgeBaseEndpoint[];
  files?: LlmKnowledgeBaseFile[];
  vectorDbFile: IMedia;
};

export type LlmAppTool = {
  id: string;
  name: string;
  description?: string;
  functionName: string;
  functionDescription: string;
  waitingMessage: string;
  knowledgeBase: LlmKnowledgeBase;
};

export type LlmRules = {
  vectorDbFile: IMedia;
};

export type LlmAppSettings = {
  credentials: LlmAppCredentials;
  knowledgeBase: LlmKnowledgeBase;
  llmConfig: LlmAppConfig;
  fineTuning: LlmFineTuning;
  appTools: LlmAppTool[];
  rules: LlmRules;
};

export type LlmFineTuning = {
  modelNameSuffix: string;
  fineTunedModelName: string;
};

export type LlmAppCredentials = {
  apiKey: string;
  appKey: string;
  httpReferrers: LlmAppReferrer[];
};

export type LlmAppPrompt = {
  firstMessage: string;
  systemMessage: string;
};

export type LlmTool = {
  name: string;
  description?: string;
  functionName: string;
  functionDescription: string;
  waitingMessage: string;
};

export type LlmAppSecrets = Record<string, string>;

export type LlmAppConfig = {
  prompt: LlmAppPrompt;
  secrets: LlmAppSecrets;
  tools: LlmTool[];
  langChainTracing: boolean;
  langChainProject: string;
};

export type LlmAppCard = {
  icon?: IMedia;
  title: string;
  body: string;
  message: string;
};

export type LlmSampleInputText = {
  id: string;
  sampleInputText: string;
};

export type LlmAppContents = {
  logo?: IMedia;
  collapsedWelcomeText: string;
  shortWelcomeText: string;
  extendedWelcomeText: string;
  sampleInputTexts: LlmSampleInputText[];
  layoutBuilder: LlmAppCard[];
};

export type LlmWebhook = {
  webhook: string;
};

export type LlmThread = {
  messages: LlmMessage[],
  threadId: string;
};

export type LlmInfo = {
  contents: LlmAppContents;
  thread?: LlmThread;
};

export type LlmApp = {
  createdAt: Date | string;
  settings: LlmAppSettings;
  id: string;
  isActive: boolean;
  name: string;
  updatedAt: Date | string;
  contents: LlmAppContents;
  webhooks: LlmWebhook[];
};
