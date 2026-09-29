import React from 'react';
import { Settings2, MonitorPlay, CircleHelp } from 'lucide-react';
import type { MirrorOptions } from '../types';

interface SettingsPanelProps {
  options: MirrorOptions;
  setOptions: React.Dispatch<React.SetStateAction<MirrorOptions>>;
  onOpenTransparency?: () => void;
  t: (key: any, values?: any) => string;
}

export function SettingsPanel({ options, setOptions, onOpenTransparency, t }: SettingsPanelProps) {
  const updateOption = (key: keyof MirrorOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="panel">
      <div className="section-title">
        <div>
          <Settings2 size={18} />
          <h3>{t('mirrorSettings')}</h3>
        </div>
      </div>

      <div className="settings-intro">
        <span>{t('recommended')}</span>
        <p>{t('mappingDescription')}</p>
      </div>

      <div className="settings-grid">
        <label className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ margin: 0 }}>{t('selectKeymapper')}</span>
            {onOpenTransparency && (
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); onOpenTransparency(); }}
                style={{ background: "none", border: 0, color: "var(--lime)", fontSize: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, padding: 0 }}
                title={t('tabTransparency')}
              >
                <CircleHelp size={12} />
                <span>{t('transparencyBadge')}</span>
              </button>
            )}
          </div>
          <select 
            value={options.targetApp ?? "auto"} 
            onChange={(e) => updateOption('targetApp', e.target.value)}
          >
            <option value="auto">{t('autoDetect')}</option>
            <option value="GG Mouse Pro">{t('ggMousePro')}</option>
            <option value="Panda Mouse Pro">{t('pandaMousePro')}</option>
          </select>
        </label>

        <label className="field">
          <span>{t('maxResolution')}</span>
          <select 
            value={options.maxSize} 
            onChange={(e) => updateOption('maxSize', parseInt(e.target.value, 10))}
          >
            <option value="1280">1280p (4GB RAM)</option>
            <option value="1440">1440p (2K)</option>
            <option value="1600">1600p</option>
            <option value="1920">1920p</option>
            <option value="2560">2560p (4K)</option>
          </select>
        </label>
        
        <label className="field">
          <span>{t('videoBitrate')}</span>
          <select 
            value={options.videoBitRateMbps} 
            onChange={(e) => updateOption('videoBitRateMbps', parseInt(e.target.value, 10))}
          >
            <option value="8">8 Mbps</option>
            <option value="12">12 Mbps ({t('recommended')})</option>
            <option value="24">24 Mbps</option>
            <option value="48">48 Mbps</option>
          </select>
        </label>

        <label className="field">
          <span>{t('maxFps')}</span>
          <select 
            value={options.maxFps} 
            onChange={(e) => updateOption('maxFps', parseInt(e.target.value, 10))}
          >
            <option value="60">60 FPS ({t('recommended')})</option>
            <option value="90">90 FPS</option>
            <option value="120">120 FPS</option>
          </select>
        </label>
      </div>

      <div className="toggles" aria-label={t('mirrorSettings')}>
        <label className="toggle-row">
          {t('turnScreenOff')}
          <input 
            type="checkbox" 
            checked={options.turnScreenOff} 
            onChange={(e) => updateOption('turnScreenOff', e.target.checked)} 
          />
          <i />
        </label>
        <label className="toggle-row">
          {t('stayAwake')}
          <input 
            type="checkbox" 
            checked={options.stayAwake} 
            onChange={(e) => updateOption('stayAwake', e.target.checked)} 
          />
          <i />
        </label>
        <label className="toggle-row">
          {t('audioForwarding')}
          <input 
            type="checkbox" 
            checked={options.audio} 
            onChange={(e) => updateOption('audio', e.target.checked)} 
          />
          <i />
        </label>
        <label className="toggle-row">
          {t('alwaysOnTop')}
          <input 
            type="checkbox" 
            checked={options.alwaysOnTop} 
            onChange={(e) => updateOption('alwaysOnTop', e.target.checked)} 
          />
          <i />
        </label>
      </div>

      <label className="experimental">
        <MonitorPlay size={22} />
        <div>
          <strong>{t('virtualDisplayUnavailable')}</strong>
          <p>{t('virtualDisplayDescription')}</p>
        </div>
        <div className="experimental-toggle toggle-row">
          <input 
            type="checkbox" 
            checked={options.virtualDisplay} 
            onChange={(e) => updateOption('virtualDisplay', e.target.checked)} 
          />
          <i />
        </div>
      </label>

      <details className="mirror-guide">
        <summary><CircleHelp size={15} />{t('mirrorGuide')}</summary>
        <div className="guide-grid">
          <div><strong>{t('guideResolution')}</strong><p>{t('guideResolutionDescription')}</p></div>
          <div><strong>{t('guideBitrate')}</strong><p>{t('guideBitrateDescription')}</p></div>
          <div><strong>{t('guideFps')}</strong><p>{t('guideFpsDescription')}</p></div>
          <div><strong>{t('guideLatency')}</strong><p>{t('guideLatencyDescription')}</p></div>
        </div>
      </details>
    </div>
  );
}
