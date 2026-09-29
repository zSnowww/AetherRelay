import React from 'react';
import { Smartphone, RefreshCw, TriangleAlert } from 'lucide-react';
import type { Device } from '../types';

interface DeviceListProps {
  devices: Device[];
  selectedSerial: string;
  onSelect: (serial: string) => void;
  onRefresh: () => void;
  busy: boolean;
  showHelp: boolean;
  t: (key: any, values?: any) => string;
}

export function DeviceList({ devices, selectedSerial, onSelect, onRefresh, busy, showHelp, t }: DeviceListProps) {
  const usable = devices.filter(d => d.state === 'device');

  return (
    <div className="panel">
      <div className="section-title">
        <div>
          <Smartphone size={18} />
          <h3>{t('selectDevice')}</h3>
        </div>
        <div className="section-actions">
          <button 
            className="icon-button" 
            onClick={onRefresh} 
            disabled={busy} 
            title={t('refresh')}
            aria-label={t('refresh')}
          >
            <RefreshCw size={14} className={busy ? "spin" : ""} />
          </button>
        </div>
      </div>

      {showHelp && (
          <div className="device-help" role="status">
          <div>
            <strong>{t('connectDeviceTitle')}</strong>
          </div>
          <ol>
            <li>{t('connectDeviceStep1')}</li>
            <li>{t('connectDeviceStep2')}</li>
            <li>{t('connectDeviceStep3')}</li>
            <li>{t('connectDeviceStep4')}</li>
          </ol>
          <p>{t('connectDeviceTip')}</p>
        </div>
      )}

      {usable.length === 0 ? (
        <div className="empty">
          <Smartphone size={32} opacity={0.5} />
          <strong>{t('waitingDevice')}</strong>
          <span>{t('enableUsbDebugging')}</span>
        </div>
      ) : (
        <div className="device-list">
          {usable.map((device) => {
            const isSelected = selectedSerial === device.serial;
            return (
              <button
                key={device.serial}
                className={`device ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(device.serial)}
              >
                <div className="phone-icon">
                  <Smartphone size={20} />
                </div>
                <div className="device-copy">
                  <strong>{device.model || 'Android Device'}</strong>
                  <small>{device.serial}</small>
                </div>
                <em>{device.state === "device" ? t("connected") : device.state === "unauthorized" ? t("unauthorized") : device.state}</em>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
