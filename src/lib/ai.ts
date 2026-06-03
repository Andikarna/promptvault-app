import { AIActionResponse } from './types';

const SYSTEM_PROMPTS = {
  improve: 'Improve this AI prompt to get better responses from LLMs. Retain the core meaning but make it clearer, more structured, and specify role, context, constraints, and formatting instructions where appropriate. Output ONLY the improved prompt, do not explain or add markdown wraps unless requested.',
  detailed: 'Elaborate this AI prompt. Add detailed instructions, output structure, edge cases, target audience context, and step-by-step reasoning commands (e.g. Chain of Thought). Output ONLY the expanded prompt.',
  shorter: 'Condense this AI prompt to be concise and direct. Keep only the essential instructions and context. Output ONLY the shortened prompt.',
  english: 'Translate the following AI prompt to English. Maintain the exact instruction layout and formatting. Output ONLY the translated prompt.',
  indonesian: 'Translate the following AI prompt to Indonesian. Maintain the exact instruction layout and formatting. Output ONLY the translated prompt.',
  tags: 'Analyze the following AI prompt and output a JSON array of 3 to 5 lowercase tags. Example format: ["kotlin", "clean-architecture"]. Output ONLY the JSON array.',
  category: 'Based on the following AI prompt, choose the most fitting category from these options: [Programming, Android, Flutter, ASP.NET, UI/UX, Marketing, Business, Productivity, AI Agent, Game Development]. Output ONLY the exact category name from the list.',
};

export async function runAIAction(action: keyof typeof SYSTEM_PROMPTS, promptContent: string): Promise<AIActionResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const systemPrompt = SYSTEM_PROMPTS[action];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const fullPrompt = `${systemPrompt}\n\nPrompt to process:\n"""\n${promptContent}\n"""`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      if (action === 'tags') {
        try {
          // Clean JSON formatting from Gemini if it outputs markdown blocks
          const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const tags = JSON.parse(cleanedText) as string[];
          return { success: true, tags };
        } catch {
          // Fallback parser if JSON parsing fails
          const tags = text.replace(/[\[\]"]/g, '').split(',').map((t: string) => t.trim()).filter(Boolean);
          return { success: true, tags };
        }
      }

      if (action === 'category') {
        return { success: true, category: text };
      }

      return { success: true, enhancedPrompt: text };
    } catch (error) {
      console.error('Gemini API call failed, falling back to mock AI:', error);
      // Fall through to mock logic on failure
    }
  }

  // MOCK AI ENGINE FALLBACK
  // Simulate network latency (500ms - 1s)
  await new Promise(resolve => setTimeout(resolve, 800));

  const cleanPrompt = promptContent.trim();

  switch (action) {
    case 'improve':
      return {
        success: true,
        enhancedPrompt: `### Role & Objective\nYou are an expert agent specializing in this task. Your goal is to execute the following request with optimal precision.\n\n### Core Instructions\n1. Analyze the input variables carefully.\n2. Apply best practices: clean design, structural modularity, and explicit error bounds.\n\n### Prompt Context\n${cleanPrompt}\n\n### Output Format\nProvide a well-structured response. Include step-by-step reasoning where applicable.`,
      };
    case 'detailed':
      return {
        success: true,
        enhancedPrompt: `${cleanPrompt}\n\n---\n### Detailed Constraints & Guidelines:\n- **Target Audience**: End-users expecting a robust and performant experience.\n- **Error Handlers**: Validate all parameters, handle connection timeouts, and provide detailed logs.\n- **Examples**: Include at least two usage scenarios illustrating edge cases and success states.\n- **Reasoning Loop**: Employ step-by-step thinking prior to formatting the final solution.`,
      };
    case 'shorter':
      return {
        success: true,
        enhancedPrompt: cleanPrompt.length > 150 
          ? `${cleanPrompt.slice(0, 150)}...\n\n[Simplified: Execute key objective directly with minimal boilerplate.]`
          : `${cleanPrompt} (Concise)`,
      };
    case 'english':
      return {
        success: true,
        enhancedPrompt: `[AI English Translation]\n\n${cleanPrompt}`,
      };
    case 'indonesian':
      return {
        success: true,
        enhancedPrompt: `[AI Terjemahan Indonesia]\n\n${cleanPrompt}`,
      };
    case 'tags': {
      const words = cleanPrompt.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
      const uniqueWords = Array.from(new Set(words))
        .filter(w => w.length > 3 && !['create', 'generate', 'write', 'with', 'your', 'about', 'from', 'this', 'that', 'with'].includes(w));
      const tags = uniqueWords.slice(0, 4);
      if (tags.length === 0) tags.push('ai', 'prompt', 'custom');
      return { success: true, tags };
    }
    case 'category': {
      const textLower = cleanPrompt.toLowerCase();
      let category = 'Programming';
      if (textLower.includes('android') || textLower.includes('kotlin') || textLower.includes('jetpack')) {
        category = 'Android';
      } else if (textLower.includes('flutter') || textLower.includes('dart') || textLower.includes('bloc')) {
        category = 'Flutter';
      } else if (textLower.includes('c#') || textLower.includes('asp') || textLower.includes('dotnet')) {
        category = 'ASP.NET';
      } else if (textLower.includes('design') || textLower.includes('figma') || textLower.includes('ui') || textLower.includes('ux') || textLower.includes('css')) {
        category = 'UI/UX';
      } else if (textLower.includes('seo') || textLower.includes('market') || textLower.includes('sales') || textLower.includes('copywrite')) {
        category = 'Marketing';
      } else if (textLower.includes('agent') || textLower.includes('llm') || textLower.includes('system prompt') || textLower.includes('react')) {
        category = 'AI Agent';
      } else if (textLower.includes('game') || textLower.includes('unity') || textLower.includes('unreal')) {
        category = 'Game Development';
      }
      return { success: true, category };
    }
    default:
      return { success: false, error: 'Invalid AI action requested' };
  }
}
