import React, { useState } from 'react';
import { Database, ExternalLink, Search, Sparkles, X } from 'lucide-react';

const DATASETS = [
  { id: 'OpenAssistant/oasst1', name: 'OpenAssistant', category: 'Chat & conversation', config: 'default', split: 'train', description: 'Human-written assistant conversations and helpful responses.' },
  { id: 'tatsu-lab/alpaca', name: 'Alpaca Instructions', category: 'Instruction following', config: 'default', split: 'train', description: 'Instruction and response examples.' },
  { id: 'rajpurkar/squad', name: 'SQuAD', category: 'Knowledge & Q&A', config: 'plain_text', split: 'train', description: 'Questions grounded in reading passages.' },
  { id: 'cornell-movie-review-data/rotten_tomatoes', name: 'Movie Reviews', category: 'Sentiment', config: 'default', split: 'train', description: 'Short reviews for text analysis.' },
  { id: 'dair-ai/emotion', name: 'Emotion', category: 'Emotion & tone', config: 'split', split: 'train', description: 'Text labeled with emotion categories.' },
  { id: 'gsm8k', name: 'GSM8K Math', category: 'Math reasoning', config: 'main', split: 'train', description: 'Math word problems with worked answers.' },
  { id: 'Salesforce/wikitext', name: 'WikiText', category: 'Reading & language', config: 'wikitext-2-raw-v1', split: 'train', description: 'Wikipedia-derived text for language tasks.' },
  { id: 'fka/awesome-chatgpt-prompts', name: 'Prompt Library', category: 'Creative prompts', config: 'default', split: 'train', description: 'Prompts for roleplay, writing, and creativity.' }
];

export default function HFDatasetLab({ onClose, onAsk }) {
  const [selected, setSelected] = useState(DATASETS[0].id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function search(event) {
    event.preventDefault();
    const dataset = DATASETS.find(item => item.id === selected);
    if (!query.trim()) { setError('Enter a search phrase first.'); return; }
    setBusy(true); setError(''); setResults([]);
    try {
      const params = new URLSearchParams({ dataset: dataset.id, config: dataset.config, split: dataset.split, query: query.trim(), offset: '0', length: '10' });
      const response = await fetch('https://datasets-server.huggingface.co/search?' + params.toString(), { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || ('Hugging Face returned HTTP ' + response.status));
      const rows = (payload.rows || []).map(item => item.row).filter(Boolean);
      if (!rows.length) throw new Error('No sample matches returned. Try another dataset or search phrase.');
      setResults(rows);
    } catch (e) { setError((e.message || 'Dataset search failed.') + ' You can still open the dataset card on Hugging Face.'); }
    finally { setBusy(false); }
  }
  const selectedDataset = DATASETS.find(item => item.id === selected);
  return <section className="dga-dataset-lab" aria-label="Hugging Face Dataset Lab">
    <div className="dga-dataset-heading"><div><strong><Database size={17} /> Dataset Lab</strong><small>Explore eight public datasets on demand. No background crawling.</small></div><button type="button" className="dga-icon-btn" onClick={onClose} aria-label="Close Dataset Lab"><X size={17} /></button></div>
    <div className="dga-dataset-catalog">{DATASETS.map(item => <button type="button" key={item.id} className={'dga-dataset-card' + (selected === item.id ? ' active' : '')} onClick={() => { setSelected(item.id); setResults([]); setError(''); }}><strong>{item.name}</strong><small>{item.category}</small><span>{item.description}</span></button>)}</div>
    <form className="dga-dataset-search" onSubmit={search}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search words in the selected dataset…" aria-label="Search selected dataset" /><button type="submit" disabled={busy || !query.trim()}>{busy ? 'Searching…' : <><Search size={14} /> Search samples</>}</button><a href={'https://huggingface.co/datasets/' + selected} target="_blank" rel="noopener noreferrer">Dataset card <ExternalLink size={13} /></a></form>
    {error && <p className="dga-dataset-error" role="alert">{error}</p>}
    {results.length > 0 && <div className="dga-dataset-results"><div className="dga-dataset-result-count">Sample matches · {results.length}</div>{results.map((row, index) => <article key={index} className="dga-dataset-result"><pre>{JSON.stringify(row, null, 2).slice(0, 1600)}</pre><button type="button" onClick={() => onAsk('Using this sample from the Hugging Face dataset ' + selectedDataset.id + ', explain what it contains and how it could be useful in defchat:\n\n' + JSON.stringify(row, null, 2).slice(0, 6500))}>Ask AI about this sample <Sparkles size={13} /></button></article>)}</div>}
  </section>;
}
