import { useEffect, useState } from 'react';
import { Download, Camera, Image, Share2, Check } from 'lucide-react';
import type { KitchenEngine } from '../game/engine';
export function PhotoStudio({ engine }: { engine: KitchenEngine }) {
  const [format, setFormat] = useState<'wide' | 'square' | 'story'>('wide');
  const [filter, setFilter] = useState<'warm' | 'original' | 'mono'>('original');
  const [caption, setCaption] = useState('A little cooking. A lot of chaos.');
  const [image, setImage] = useState(''), [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => { try { setImage(engine.capture(format, filter, caption)); setError(''); } catch { setError('The photo could not be captured. Try a lower graphics quality, then reopen the studio.'); } }, 180); return () => window.clearTimeout(timer); }, [engine, format, filter, caption]);
  const download = () => { const a = document.createElement('a'); a.href = image; a.download = `cook-or-kaboom-${format}.png`; a.click(); setMessage('Saved! Your kitchen memory is ready to share.'); };
  const share = async () => {
    try {
      const blob = await (await fetch(image)).blob(); const file = new File([blob], 'cook-or-kaboom.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Cook or KABOOM!' }); setMessage('Memory shared!'); }
      else { download(); setMessage('Photo downloaded. Upload it to your favorite app to share.'); }
    } catch (e) { if ((e as Error).name !== 'AbortError') setMessage('Sharing is unavailable here. Use Save photo instead.'); }
  };
  return <div className="photo-studio"><p className="muted">A real snapshot from your kitchen. Photos stay on your device.</p>
    <div className={`photo-preview ${format}`}>{image && <img src={image} alt="Your current 3D kitchen photograph" />}{error && <p role="alert">{error}</p>}</div>
    <div className="photo-options"><label><Image size={16} /> Format<select value={format} onChange={e => setFormat(e.target.value as typeof format)}><option value="wide">Wide · 1920 × 1080</option><option value="square">Square · 1080 × 1080</option><option value="story">Story · 1080 × 1920</option></select></label><label><Camera size={16} /> Filter<select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="original">Fresh from the kitchen</option><option value="warm">Golden hour</option><option value="mono">Old-school chef</option></select></label></div>
    <label className="text-label">Add a little memory<input maxLength={60} value={caption} onChange={e => setCaption(e.target.value)} /></label>
    <div className="button-row"><button className="button primary" onClick={download} disabled={!image}><Download size={18} /> Save photo</button><button className="button secondary" onClick={() => void share()} disabled={!image}><Share2 size={18} /> Share</button></div>
    {message && <p className="success-note" role="status"><Check size={17} />{message}</p>}
  </div>;
}
