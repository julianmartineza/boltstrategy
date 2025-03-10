import React, { useState, useEffect } from 'react';
import { Activity, Stage, Message } from '../../../types';
import { Send, Loader2 } from 'lucide-react';
import { useProgramStore } from '../../../store/programStore';
import { StrategyBot } from '../../../lib/strategy/botLogic';

interface ActivityBotProps {
  activity: Activity;
  stageContext: Stage;
}

export default function ActivityBot({ activity, stageContext }: ActivityBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bot, setBot] = useState<StrategyBot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { completeActivity } = useProgramStore();

  useEffect(() => {
    if (!activity || !stageContext) {
      setError('Activity or stage context is missing');
      return;
    }

    try {
      // Initialize the bot with current stage and activity
      const strategyBot = new StrategyBot(stageContext, activity);
      setBot(strategyBot);
      setError(null);

      // Initialize conversation with activity context
      setMessages([
        {
          id: '1',
          content: `Let's work on ${activity.name}. ${activity.description}`,
          sender: 'ai',
          timestamp: new Date(),
          metadata: {
            stage: stageContext.id,
            activity: activity.id,
            type: 'guidance'
          }
        }
      ]);
    } catch (err) {
      setError('Failed to initialize activity. Please try again.');
      console.error('Error initializing bot:', err);
    }
  }, [activity, stageContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !bot || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      metadata: {
        stage: stageContext.id,
        activity: activity.id,
        type: 'response'
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      // Process the response using the strategy bot
      const aiResponse = await bot.processResponse(input);
      setMessages(prev => [...prev, aiResponse]);

      // If the activity is complete, save the responses
      if (aiResponse.metadata?.type === 'summary') {
        await completeActivity(activity.id, {
          responses: messages.concat(userMessage, aiResponse)
        });
      }
    } catch (err) {
      console.error('Error processing response:', err);
      setError('Failed to process response. Please try again.');
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Sorry, there was an error processing your response. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        metadata: {
          stage: stageContext.id,
          activity: activity.id,
          type: 'error'
        }
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
        <p className="text-sm text-gray-500">{stageContext.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-lg rounded-lg px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.metadata?.type === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>Send</span>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}