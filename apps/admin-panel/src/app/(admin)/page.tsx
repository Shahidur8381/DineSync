'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAdminSocket } from '@/lib/useAdminSocket';

interface Summary {
  totalMeals: number;
  consumedMeals: number;
  mealsLeft: number;
  onlineDevices: number;
  offlineDevices: number;
}

interface MealSession {
  isActive: boolean;
  mealType: string;
  totalMeals: number;
}

interface LogItem {
  id: string;
  deviceId: string;
  type: string;
  message: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [session, setSession] = useState<MealSession | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [gasAlert, setGasAlert] = useState(false);
  const [inputTotalMeals, setInputTotalMeals] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [sum, sess, lg] = await Promise.all([
        api.get<Summary>('/api/admin/analytics/summary'),
        api.get<MealSession>('/api/admin/meal-session'),
        api.get<LogItem[]>('/api/admin/logs'),
      ]);
      setSummary(sum);
      setSession(sess);
      setInputTotalMeals(sess.totalMeals.toString());
      setLogs(lg);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAdminSocket({
    onLog: (event: any) => {
      setLogs((prev) => [event.log, ...prev].slice(0, 50));
      loadData(); // refresh summary counts
    },
    onGasAlert: () => {
      setGasAlert(true);
      setTimeout(() => setGasAlert(false), 10000); // hide after 10s
    },
    onMealReset: () => {
      loadData();
    }
  });

  async function toggleSession() {
    if (!session) return;
    try {
      await api.put('/api/admin/meal-session', { isActive: !session.isActive });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function saveTotalMeals() {
    try {
      await api.put('/api/admin/meal-session', { totalMeals: parseInt(inputTotalMeals) });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  function fmt(dt: string) {
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Operations Dashboard</h1>
          <p className="page-subtitle">Real-time view of the dining hall</p>
        </div>
      </div>

      {gasAlert && (
        <div style={{ background: 'var(--red)', color: 'white', padding: 20, borderRadius: 8, marginBottom: 20, fontWeight: 'bold', fontSize: 20, textAlign: 'center' }}>
          ⚠️ GAS LEAKAGE DETECTED! PLEASE CHECK THE KIOSK IMMEDIATELY! ⚠️
        </div>
      )}

      {/* Admin Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Meal Session Control</div>
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Session Status</label>
            <button 
              onClick={toggleSession}
              className={`btn btn-lg ${session?.isActive ? 'btn-danger' : 'btn-primary'}`}
            >
              {session?.isActive ? 'TURN OFF MEAL' : 'TURN ON MEAL'}
            </button>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Total Meals Prepared</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="number" 
                className="input" 
                value={inputTotalMeals}
                onChange={e => setInputTotalMeals(e.target.value)}
                style={{ width: 150 }}
              />
              <button className="btn btn-secondary" onClick={saveTotalMeals}>Save</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          icon="🍽️"
          label="Total Meals"
          value={summary?.totalMeals ?? '—'}
          color="var(--blue)"
          bg="var(--bg-card)"
        />
        <StatCard
          icon="✅"
          label="Meals Consumed"
          value={summary?.consumedMeals ?? '—'}
          color="var(--green)"
          bg="var(--green-dim)"
        />
        <StatCard
          icon="⏳"
          label="Meals Left"
          value={summary?.mealsLeft ?? '—'}
          color="var(--amber)"
          bg="var(--amber-dim)"
        />
        <StatCard
          icon="📡"
          label="Online Devices"
          value={summary ? `${summary.onlineDevices}` : '—'}
          color="var(--teal)"
          bg="var(--teal-dim)"
        />
      </div>

      {/* Live feed */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Live Activity Log</div>
            <div className="card-subtitle">Real-time updates from Kiosk</div>
          </div>
          <span className="badge badge-green">
            <span className="status-dot status-dot-online" />
            Live
          </span>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-icon">📭</div>
              <div className="empty-text">Waiting for activity...</div>
            </div>
          ) : (
            logs.map((item) => (
              <div key={item.id} className="feed-item" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span className={`feed-dot ${item.type === 'INFO' ? 'feed-dot-green' : 'feed-dot-red'}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="feed-name">{item.message}</div>
                </div>
                <span className="feed-time">{fmt(item.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color, bg,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
  bg: string;
}) {
  return (
    <div className="stat-card" style={{ '--accent-color': color } as React.CSSProperties}>
      <div className="stat-icon" style={{ background: bg }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
