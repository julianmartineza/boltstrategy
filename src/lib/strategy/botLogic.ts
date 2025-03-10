import { Stage, Activity, Message } from '../../types';
import { stagePrompts, systemPrompts } from './prompts';
import { generateBotResponse } from '../openai';
import { supabase } from '../supabase';

interface BotState {
  currentStep: number;
  completedSteps: string[];
  collectedData: Record<string, any>;
  previousMessages: Array<{role: 'user' | 'assistant', content: string}>;
}

export class StrategyBot {
  private state: BotState;
  private stage: Stage;
  private activity: Activity;
  private companyData: any;
  private diagnosticData: any;
  private previousActivities: any[];

  constructor(stage: Stage, activity: Activity) {
    this.stage = stage;
    this.activity = activity;
    this.state = {
      currentStep: 0,
      completedSteps: [],
      collectedData: {},
      previousMessages: []
    };
    this.previousActivities = [];
    this.loadContextData();
  }

  private async loadContextData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load company data
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load diagnostic data
      const { data: diagnostic } = await supabase
        .from('diagnostics')
        .select('*')
        .eq('company_id', company?.id)
        .single();

      // Load previous activity responses
      const { data: previousResponses } = await supabase
        .from('activity_responses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      this.companyData = company;
      this.diagnosticData = diagnostic;
      this.previousActivities = previousResponses || [];

      // Initialize first message if no previous messages
      if (this.state.previousMessages.length === 0) {
        const activityPrompts = this.getActivityPrompts();
        if (activityPrompts?.initial) {
          this.state.previousMessages.push({
            role: 'assistant',
            content: `${activityPrompts.introduction}\n\n${activityPrompts.initial}`
          });
        }
      }
    } catch (error) {
      console.error('Error loading context data:', error);
    }
  }

  private getActivityPrompts() {
    const stageName = this.stage.name.toLowerCase();
    const activityName = this.activity.name.toLowerCase();
    
    return stagePrompts[stageName]?.activities[activityName];
  }

  private buildContext() {
    return {
      company: this.companyData,
      diagnostic: this.diagnosticData,
      previousActivities: this.previousActivities.reduce((acc, response) => {
        acc[response.activity_id] = response.content;
        return acc;
      }, {}),
      currentProgress: {
        stage: this.stage.name,
        activity: this.activity.name,
        step: this.state.currentStep,
        collectedData: this.state.collectedData
      }
    };
  }

  async processResponse(input: string): Promise<Message> {
    try {
      // Add user message to previous messages
      this.state.previousMessages.push({
        role: 'user',
        content: input
      });

      // Build context for AI
      const context = this.buildContext();
      
      // Generate system prompt
      const systemPrompt = systemPrompts.activityGuide(this.activity, context);

      // Generate response using OpenAI
      const response = await generateBotResponse(input, {
        systemPrompt,
        stage: this.stage.name,
        activity: this.activity.name,
        previousMessages: this.state.previousMessages,
        context
      });

      // Add bot response to previous messages
      this.state.previousMessages.push({
        role: 'assistant',
        content: response || ''
      });

      // Update state and check completion
      this.updateState(input, response || '');

      // Determine if this completes the activity
      const isComplete = this.isActivityComplete();
      
      // If complete, save the final response
      if (isComplete) {
        await this.saveActivityResponse();
      }

      return {
        id: Date.now().toString(),
        content: response || '',
        sender: 'ai',
        timestamp: new Date(),
        metadata: {
          stage: this.stage.id,
          activity: this.activity.id,
          type: isComplete ? 'summary' : 'guidance',
          progress: this.state.currentStep
        }
      };
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  }

  private async saveActivityResponse() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const summary = this.generateActivitySummary();

      await supabase
        .from('activity_responses')
        .insert([{
          activity_id: this.activity.id,
          user_id: user.id,
          content: {
            messages: this.state.previousMessages,
            summary,
            collectedData: this.state.collectedData
          }
        }]);
    } catch (error) {
      console.error('Error saving activity response:', error);
    }
  }

  private generateActivitySummary(): string {
    // Extract key insights from the conversation
    const userMessages = this.state.previousMessages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    // Combine user responses into a coherent summary
    return userMessages.join('\n\n');
  }

  private updateState(input: string, response: string): void {
    this.state.currentStep++;
    this.state.completedSteps.push(input);
    
    // Store collected data based on activity type
    const activityName = this.activity.name.toLowerCase();
    
    if (activityName.includes('paradigm')) {
      this.state.collectedData.paradigms = this.state.collectedData.paradigms || [];
      this.state.collectedData.paradigms.push({
        original: input,
        response: response
      });
    } else if (activityName.includes('purpose')) {
      this.state.collectedData.purpose = input;
      this.state.collectedData.purposeRefinement = response;
    } else if (activityName.includes('value')) {
      this.state.collectedData.values = this.state.collectedData.values || [];
      this.state.collectedData.values.push({
        value: input,
        explanation: response
      });
    }
  }

  private isActivityComplete(): boolean {
    const activityName = this.activity.name.toLowerCase();
    
    // Define completion criteria for different activity types
    switch (activityName) {
      case 'identify_current_paradigms':
        return this.state.collectedData.paradigms?.length >= 3;
      case 'transform_paradigms':
        return this.state.currentStep >= 4;
      case 'purpose_definition':
        return this.state.currentStep >= 3;
      case 'value_definition':
        return this.state.collectedData.values?.length >= 3;
      default:
        return this.state.currentStep >= 5;
    }
  }
}