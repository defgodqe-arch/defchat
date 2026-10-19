import React from 'react';
import { ArrowUpRight, Bot, X } from 'lucide-react';

const AI_URL = 'https://ai.defgodqe.workers.dev/';

export default function DefgodqeAI({ onClose }) {
  return (
    <div className="defgodqe-ai-overlay" role="dialog" aria-modal="true" aria-label="defgodqe AI">
      <section className="defgodqe-ai-window">
        <header className="defgodqe-ai-toolbar">
          <div className="defgodqe-ai-heading">
            <span className="defgodqe-ai-mark"><Bot size={20} /></span>
            <span><strong>defgodqe AI</strong><small>Your AI. Your Ideas. Your World.</small></span>
          </div>
          <div className="defgodqe-ai-actions">
            <a href={AI_URL} target="_blank" rel="noopener noreferrer" title="Open defgodqe AI in a new tab">
              <ArrowUpRight size={17} /> <span>Open separately</span>
            </a>
            <button type="button" onClick={onClose} aria-label="Close AI" title="Back to chat"><X size={19} /></button>
          </div>
        </header>
        <iframe
          className="defgodqe-ai-frame"
          src={AI_URL}
          title="defgodqe AI assistant"
          allow="microphone; camera; autoplay; clipboard-read; clipboard-write; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>
    </div>
  );
}
