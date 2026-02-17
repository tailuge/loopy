export async function listGoogleModels(): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return 'Error: GOOGLE_GENERATIVE_AI_API_KEY not set in environment';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as { models: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    
    const textModels = data.models
      .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => {
        const versionA = parseFloat(a.match(/\d+\.?\d*/)?.[0] || '0');
        const versionB = parseFloat(b.match(/\d+\.?\d*/)?.[0] || '0');
        return versionB - versionA;
      });
    
    return `Available Google Generative AI models:\n\n${textModels.map(m => `  ${m}`).join('\n')}\n\nTotal: ${textModels.length} models`;
  } catch (error) {
    return `Error fetching models: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function listOpenRouterModels(): Promise<string> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { data: Array<{ id: string }> };
    const models = data.data.map(m => m.id).sort();
    return `Available OpenRouter models:\n\n${models.map(m => `  ${m}`).join('\n')}\n\nTotal: ${models.length} models`;
  } catch (error) {
    return `Error fetching models: ${error instanceof Error ? error.message : String(error)}`;
  }
}
