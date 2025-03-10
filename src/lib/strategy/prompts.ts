// Prompt templates for each stage of the strategy program
export const stagePrompts = {
  paradigms: {
    introduction: `Let's identify the paradigms that might be limiting your company's potential. 
    Paradigms are deeply rooted beliefs that influence how we make decisions.`,
    
    activities: {
      identifyCurrentParadigms: {
        initial: "To begin, could you share 3-4 fundamental beliefs or assumptions you have about your industry or business?",
        followUp: (paradigms: string) => `I've identified these paradigms in your response:
          ${paradigms}
          
          Could you explain how each of these influences your business decisions?`,
        challenge: (paradigm: string) => `Let's consider this paradigm: "${paradigm}"
          What evidence do you have that this belief is absolutely true?
          What opportunities might you be missing by holding this belief?`
      },
      transformParadigms: {
        prompt: (limitingParadigm: string) => `Let's transform this limiting paradigm:
          "${limitingParadigm}"
          
          How could we reframe it in a way that opens up new possibilities?`,
        validation: (newParadigm: string) => `The proposed new paradigm is:
          "${newParadigm}"
          
          Do you feel this new perspective opens up more possibilities?`
      }
    }
  },
  
  corporateIdentity: {
    introduction: `Let's define your company's corporate identity. 
    This will be the foundation for all future strategic decisions.`,
    
    activities: {
      purposeDefinition: {
        initial: "What is your company's fundamental purpose? What significant problem are you solving in the world?",
        refine: (purpose: string) => `Based on your response:
          "${purpose}"
          
          Let's dig deeper: Why is this truly important to you and to society?`
      },
      valueDefinition: {
        prompt: "What are the core values that guide your business decisions?",
        validate: (values: string[]) => `You've identified these values:
          ${values.join(', ')}
          
          For each value, could you give a concrete example of how it manifests in your daily operations?`
      }
    }
  },
  
  valueProposition: {
    introduction: `Now let's craft your value proposition based on the insights we've gathered.`,
    
    activities: {
      customerPainPoints: {
        initial: "What are the main challenges or pain points your customers face?",
        followUp: (painPoints: string) => `From these pain points:
          ${painPoints}
          
          Which ones do you believe your company is uniquely positioned to solve?`
      },
      solutionDifferentiation: {
        prompt: (context: { paradigms: string[], purpose: string }) => `
          Considering your transformed paradigms:
          ${context.paradigms.join('\n')}
          
          And your purpose:
          ${context.purpose}
          
          How does your solution differ from existing alternatives in the market?`
      }
    }
  }
};

export const systemPrompts = {
  contextBuilder: (companyData: any, previousResponses: any[]) => `
    You are an AI strategy consultant helping a company develop their strategic plan.
    
    Company Context:
    - Name: ${companyData.name}
    - Industry: ${companyData.industry}
    - Size: ${companyData.size}
    - Annual Revenue: $${companyData.annual_revenue}
    
    Previous Insights:
    ${previousResponses.map(r => `- ${r.activity}: ${r.summary}`).join('\n')}
    
    Your role is to:
    1. Guide the conversation based on previous insights
    2. Ask probing questions to deepen understanding
    3. Challenge assumptions when appropriate
    4. Help synthesize insights into actionable strategies
    5. Maintain context across different activities
    
    Maintain a professional yet conversational tone. Focus on practical, actionable insights.
  `,
  
  activityGuide: (activity: any, context: any) => `
    Current Activity: ${activity.name}
    Objective: ${activity.description}
    
    Use this context from previous activities:
    ${Object.entries(context).map(([key, value]) => `${key}: ${value}`).join('\n')}
    
    Guide the user through this activity by:
    1. Starting with open-ended questions
    2. Following up with specific probes based on their responses
    3. Challenging assumptions when relevant
    4. Summarizing key insights before concluding
    
    Ensure all responses are:
    - Specific to their industry and situation
    - Actionable and practical
    - Connected to previous insights
    - Building towards the activity's objective
  `
};