# @websolutespa/payload-plugin-bowl-llm

[![npm version](https://badge.fury.io/js/%40websolutespa%2Fpayload-plugin-bowl-llm.svg)](https://badge.fury.io/js/%40websolutespa%2Fpayload-plugin-bowl-llm)

[![status alpha](https://img.shields.io/badge/status-alpha-red.svg)](https://shields.io/)

LLM plugin for Bowl PayloadCms plugin.

# LLM Plugin for Bowl PayloadCms plugin

A plugin for [Bowl PayloadCms plugin](https://www.npmjs.com/package/@websolutespa/payload-plugin-bowl) that adds collections and UI components to manage llm applications.

### Requirements:

- Payload CMS version 1.2.1 or higher is required.

## Installation

```bash
npm i @websolutespa/payload-plugin-bowl-llm
```

## Usage

```ts
import { buildConfig } from 'payload/config';
import bowl from '@websolutespa/payload-plugin-bowl';
import llm from '@websolutespa/payload-plugin-bowl-llm';
import '@websolutespa/payload-plugin-bowl-llm/dist/index.css';

export default buildConfig({
  plugins: [
    bowl({
      plugins: [
        llm(),
      ],
    }),
});
```

## Plugin options

No options available to configure the plugin.

---

##### *this library is for internal usage and not production ready*
