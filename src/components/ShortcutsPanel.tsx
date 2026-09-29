import React from 'react';
import { Command } from 'lucide-react';

interface ShortcutsPanelProps {
  t: (key: any, values?: any) => string;
}

export function ShortcutsPanel({ t }: ShortcutsPanelProps) {
  return (
    <section className="shortcuts-panel" aria-label={t('shortcuts')}>
      <div className="section-title">
        <div>
          <Command size={18} />
          <h3>{t('shortcuts')}</h3>
        </div>
      </div>
      <div className="shortcut-grid">
        <div className="shortcut">
          <kbd>Alt + F</kbd>
          <span>{t('toggleFullscreen')}</span>
        </div>
        <div className="shortcut">
          <kbd>Alt + O</kbd>
          <span>{t('togglePhoneScreen')}</span>
        </div>
        <div className="shortcut">
          <kbd>Alt + Shift + O</kbd>
          <span>{t('togglePhoneScreen')}</span>
        </div>
        <div className="shortcut">
          <kbd>Alt + ↑</kbd>
          <span>{t('adjustVolume')}</span>
        </div>
        <div className="shortcut">
          <kbd>Alt + ↓</kbd>
          <span>{t('adjustVolume')}</span>
        </div>
        <div className="shortcut">
          <kbd>Alt + I</kbd>
          <span>{t('toggleFps')}</span>
        </div>
      </div>
      <div className="shortcut-note">
        {t('shortcutNote')}
      </div>
    </section>
  );
}
