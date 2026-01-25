'use client';

import { useState, useEffect } from 'react';

export default function SetUsernameModal({ isOpen, onClose, onSubmit }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Prevent closing modal with Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate username
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (username.trim().length > 20) {
      setError('Username must be at most 20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(username.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to set username');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-purple-500 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-3xl font-black text-white mb-2">
            CHOOSE YOUR USERNAME
          </h2>
          <p className="text-gray-400 text-sm">
            This can only be set once and cannot be changed later
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-white font-bold mb-2 text-sm">
              USERNAME
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
              maxLength={20}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm font-bold">❌ {error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'SETTING...' : 'SET USERNAME'}
            </button>
          </div>
        </form>

        {/* Warning */}
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-400 text-xs text-center font-bold">
            ⚠️ WARNING: This username is permanent and cannot be changed!
          </p>
        </div>
      </div>
    </div>
  );
}
