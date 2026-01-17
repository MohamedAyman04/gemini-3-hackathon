import { useState } from 'react';
import { Mic, MicOff, Radio, Activity, Bug, LogIn } from 'lucide-react';
import './App.css';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isRecording, startRecording, stopRecording, audioData, error } = useMediaRecorder();
  const { isAuthenticated, isLoading, user, login, debugLogin } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [hurdles] = useState<string[]>([]);

  const toggleConnection = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center text-center gap-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-purple-500 w-10 h-10" />
          <h1 className="text-2xl font-bold tracking-tight">VibeCheck</h1>
        </div>

        <p className="text-gray-400 max-w-xs">
          Connect your account to start an autonomous testing session.
        </p>

        <button
          onClick={login}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full justify-center max-w-xs"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Dashboard
        </button>

        {/* Dev Mode Bypass */}
        <button
          onClick={debugLogin}
          className="text-xs text-gray-600 hover:text-gray-400 underline decoration-dotted transition-colors"
        >
          [DEV] Bypass Auth
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Only works with active session on localhost:3000
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="text-purple-500 w-6 h-6" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight leading-none">VibeCheck</h1>
            {user && <span className="text-[10px] text-gray-400">Hi, {user.name.split(' ')[0]}</span>}
          </div>
        </div>
        <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${isRecording ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {isRecording ? 'CONNECTED' : 'OFFLINE'}
        </div>
      </header>

      {/* Main Control */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 py-8">

        {/* Connection Ring */}
        <div className="relative group">
          <div className={`absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${isRecording ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-700'}`}></div>
          <button
            onClick={toggleConnection}
            className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center bg-gray-900 border-4 transition-all duration-300 shadow-2xl ${isRecording ? 'border-purple-500 shadow-purple-500/20' : 'border-gray-700 hover:border-gray-600'}`}
          >
            {isRecording ? (
              <Radio className="w-12 h-12 text-purple-500 animate-pulse" />
            ) : (
              <Radio className="w-12 h-12 text-gray-500" />
            )}
            <span className="mt-2 text-sm font-semibold tracking-widest uppercase text-gray-400">
              {isRecording ? 'LIVE' : 'Start'}
            </span>
          </button>
        </div>

        {/* Audio Visualizer Placeholder */}
        <div className="w-full h-16 bg-gray-800/50 rounded-lg flex items-end justify-center gap-1 overflow-hidden border border-gray-800/50 p-2">
          {error && (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="text-red-500 text-xs text-center">{error}</div>
              {error.includes('denied') && (
                <button
                  onClick={() => window.open(chrome.runtime.getURL('sidepanel.html'), '_blank')}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 transition-colors"
                >
                  Open in Tab to Fix
                </button>
              )}
            </div>
          )}
          {!error && isRecording ? (
            Array.from({ length: 20 }).map((_, i) => {
              // Map visualizer data to height (simple scaling)
              // Data array is 32 items (fftSize/2), we use first 20
              const value = audioData[i] || 0;
              const height = Math.max(4, (value / 255) * 100);

              return (
                <div
                  key={i}
                  className="w-1 bg-purple-500 rounded-t-sm transition-all duration-75"
                  style={{
                    height: `${height}%`,
                    opacity: 0.5 + (value / 510) // Dynamic opacity
                  }}
                />
              )
            })
          ) : (
            <span className="text-gray-600 text-xs uppercase tracking-wider">Audio Inactive</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        </div>

      </main>

      {/* Hurdles Log */}
      <section className="bg-gray-800/30 rounded-xl p-4 border border-gray-800 h-48 flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-gray-400 border-b border-gray-700/50 pb-2">
          <Bug className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Detected Hurdles</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {hurdles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
              <Activity className="w-8 h-8" />
              <p className="text-xs text-center">No hurdles detected.<br />Go break something.</p>
            </div>
          ) : (
            hurdles.map((msg, i) => (
              <div key={i} className="text-xs p-2 rounded bg-gray-800 border border-gray-700 text-red-300">
                {msg}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
export default App;
