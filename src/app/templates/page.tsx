import React from 'react';
import TemplatesGallery from '@/components/TemplatesGallery';

// Standard prompt templates
const STANDARDIZED_TEMPLATES = [
  {
    title: 'Jetpack Compose MVI Feature Block',
    description: 'Generates a Kotlin directory block and starter files matching MVI Clean Architecture.',
    prompt: 'You are an expert Android developer. Write Jetpack Compose MVI boilerplate code for a feature called [FeatureName]. Produce the State, Event (Intent), and Effect classes, followed by the ViewModel handling state transition, and the Compose Screen displaying states. Follow Android SOLID principles.',
    category: 'Android',
    aiTool: 'Claude 3.5 Sonnet',
    language: 'English',
    tags: ['kotlin', 'compose', 'mvi', 'android-dev'],
  },
  {
    title: 'EF Core Repository Generator',
    description: 'Builds C# ASP.NET Core generic repository interfaces and Entity Framework contexts.',
    prompt: 'You are a Senior .NET Backend engineer. Write a C# generic repository boilerplate interface \`IRepository<T>\` and its implementation \`Repository<T>\` using Entity Framework Core for ASP.NET Core 9. Integrate async database operations (AddAsync, UpdateAsync, GetByIdAsync, ListAllAsync) and include transaction safety wrappers.',
    category: 'ASP.NET',
    aiTool: 'ChatGPT 4o',
    language: 'English',
    tags: ['csharp', 'aspnet-core', 'ef-core', 'clean-code'],
  },
  {
    title: 'Next.js 15 Route Handler Template',
    description: 'A TypeScript route handler skeleton featuring request validation and JSON responses.',
    prompt: 'Create a clean Next.js 15 Route Handler in TypeScript for a POST request. The handler must: 1) Parse and validate the request body using a Zod schema, 2) Mock database persistence with error boundaries, 3) Return standardized JSON success/error envelopes, and 4) Set appropriate CORS/caching headers.',
    category: 'Programming',
    aiTool: 'Claude 3.5 Sonnet',
    language: 'English',
    tags: ['nextjs', 'typescript', 'api-routes', 'zod'],
  },
  {
    title: 'Unity 3D Enemy State Machine',
    description: 'A modular C# state pattern builder for Unity enemy controller state changes.',
    prompt: 'Write C# scripts for a modular Enemy State Machine controller in Unity. Define the abstract base \`EnemyState\` class and implement concrete states: \`PatrolState\`, \`ChaseState\`, and \`AttackState\`. Use standard Unity event triggers and explain how to wire the state machine on a GameObject.',
    category: 'Game Development',
    aiTool: 'ChatGPT 4o',
    language: 'English',
    tags: ['csharp', 'unity-3d', 'state-machine', 'game-dev'],
  },
  {
    title: 'Landing Page Microcopy Builder',
    description: 'A structured copywriting framework for hero sections, feature grids, and CTAs.',
    prompt: 'You are a veteran conversion rate optimization (CRO) copywriter. Help me write the copy for a SaaS landing page in the [Niche] space. Generate: 1) Three variants of a compelling Hero Headline + Subheadline, 2) Benefits bullets addressing developer pain points, and 3) A high-contrast Call to Action label. Focus on clarity and value proposition.',
    category: 'UI/UX',
    aiTool: 'GPT-4',
    language: 'English',
    tags: ['copywriting', 'conversion', 'saas', 'marketing'],
  },
  {
    title: 'Cold Outreach Email Sequencer',
    description: 'A high-converting 3-step cold email flow targeting technical decision makers.',
    prompt: 'Generate a 3-step B2B cold email sequence targeting CTOs/Engineering Directors to pitch [MyProduct]. Email 1: The Hook & Pain Point (under 120 words). Email 2: The Value Case Studies (under 100 words). Email 3: The Short Goodbye (under 80 words). Keep it highly conversational, authentic, and free of sales fluff.',
    category: 'Marketing',
    aiTool: 'ChatGPT 4o',
    language: 'English',
    tags: ['outreach', 'copywriting', 'email', 'marketing'],
  },
  {
    title: 'SEO Blog Outline Structurer',
    description: 'Generates SEO-optimized H2/H3 structures based on target keywords.',
    prompt: 'You are an SEO strategist. Create a comprehensive, search-optimized outline for a blog post targeting the keyword: "[TargetKeyword]". Suggest a high-clickthrough title, outline the complete H2 and H3 tag structure, specify search intent focus for each section, and list LSI secondary keywords to integrate.',
    category: 'Marketing',
    aiTool: 'ChatGPT 4o',
    language: 'English',
    tags: ['seo', 'copywriting', 'blogging', 'ranking'],
  },
  {
    title: 'LLM Chatbot ReAct Agent Prompt',
    description: 'Configures an AI assistant to execute tool calls in a Reason-and-Action loop.',
    prompt: 'Configure a LLM system prompt to function as a ReAct agent. You have access to: [list of tools]. For any request, you must output: Thought: (reasoning), Action: (tool name with input), Observation: (outcome). Iterate until you reach finality, then output: Final Answer: [response]. Strictly forbid outputting raw calculations without tool queries.',
    category: 'AI Agent',
    aiTool: 'Gemini 1.5 Pro',
    language: 'English',
    tags: ['system-prompt', 'agent', 'react-loop', 'ai-engineering'],
  },
  {
    title: 'UI Component Design System Spec',
    description: 'Generates spacing, typography, and styling variables for Tailwind/CSS variables.',
    prompt: 'Create a UI design token specification sheet for a modern dark-theme dashboard. Output: 1) HSL palette (background, card, primary, secondary, borders, accents), 2) Font scale (Geist or Inter font-family), 3) Spacing multiplier token variables, and 4) Subtle shadow elevations. Format as clean Tailwind configuration mappings.',
    category: 'UI/UX',
    aiTool: 'Claude 3.5 Sonnet',
    language: 'English',
    tags: ['design-system', 'tokens', 'tailwind', 'ui-ux'],
  }
];

export default function TemplatesPage() {
  return <TemplatesGallery templates={STANDARDIZED_TEMPLATES} />;
}
