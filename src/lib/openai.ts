import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
});

interface ChatContext {
  systemPrompt?: string;
  stage: string;
  activity: string;
  previousMessages: Array<{role: 'user' | 'assistant', content: string}>;
  context?: any;
}

export async function generateBotResponse(
  input: string, 
  context: ChatContext
) {
  try {
    const messages = [
      {
        role: 'system',
        content: context.systemPrompt || `You are an AI strategy consultant helping with the "${context.stage}" stage, 
        specifically the "${context.activity}" activity. Use the provided context to guide the conversation effectively.`
      },
      // Add context if available
      ...(context.context ? [{
        role: 'system',
        content: `Context Information: ${JSON.stringify(context.context)}`
      }] : []),
      // Add previous conversation context
      ...context.previousMessages,
      // Add current user input
      {
        role: 'user',
        content: input
      }
    ];

    const completion = await openai.chat.completions.create({
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating bot response:', error);
    throw error;
  }
}