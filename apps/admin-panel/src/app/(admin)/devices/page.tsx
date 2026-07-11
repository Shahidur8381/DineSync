'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdminSocket } from '@/lib/useAdminSocket';

interface Device {
  id: string;
  name: string;
  location: string;
  firmwareVersion?: string;
  lastHeartbeat?: string;
  status: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);

  async function load() {
    try {
      const data = await api.get<Device[]>('/api/admin/devices');
      setDevices(data);
    } catch (err) { console.error(err); }
  }

  useEffect(() => { load(); }, []);

  useAdminSocket({
    onDeviceStatus: ({ deviceId, status }) => {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status, lastHeartbeat: status === 'ONLINE' ? new Date().toISOString() : d.lastHeartbeat } : d));
    },
  });

  function timeSince(dt?: string) {
    if (!dt) return 'Never';
    const diff = Date.now() - new Date(dt).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Device Health</h1>
          <p className="page-subtitle">Real-time kiosk status</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {devices.map((d) => (
          <div key={d.id} className="card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{d.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{d.location}</p>
              </div>
              <span className={`badge ${d.status === 'ONLINE' ? 'badge-green' : 'badge-muted'}`}>
                <span className={`status-dot ${d.status === 'ONLINE' ? 'status-dot-online' : 'status-dot-offline'}`} />
                {d.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Device ID</div>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{d.id}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Firmware</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{d.firmwareVersion || '—'}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '10px 12px', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Last Heartbeat</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: d.status === 'ONLINE' ? 'var(--green)' : 'var(--text-muted)' }}>
                  {timeSince(d.lastHeartbeat)}
                  {d.lastHeartbeat && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>
                    ({new Date(d.lastHeartbeat).toLocaleString()})
                  </span>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {devices.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <div className="empty-text">No devices registered</div>
          </div>
        )}
      </div>
    </div>
  );
}
