import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { db } from '../db';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const p = await db.settings.get('default');
      const prov = p?.provider || 'groq';
      setProvider(prov);

      const k = await db.keys.get(prov);
      if (k?.apiKey) setApiKey(k.apiKey);
    }
    void load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await db.settings.put({ id: 'default', provider, theme: 'dark' });
    await db.keys.put({ provider, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[16px] border border-white/10 bg-[#0D0D14] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <IconButton onClick={onClose} type="button">
            <X size={18} />
          </IconButton>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">AI Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setApiKey('');
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none [&>option]:bg-[#0D0D14] [&>option]:text-white"
            >
              <option value="groq" className="bg-[#0D0D14] text-white">Groq</option>
              <option value="ollama" className="bg-[#0D0D14] text-white">Ollama (Local)</option>
            </select>
          </div>

          {provider !== 'ollama' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider} API key`}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-xs text-white/50">Stored locally in your browser. Never sent to our servers.</p>
            </div>
          )}

          <div className="pt-2">
            <Button className="w-full" type="submit" size="md">
              {saved ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
