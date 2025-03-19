export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-lg rounded-lg px-4 py-3 bg-gray-100 text-gray-900">
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
