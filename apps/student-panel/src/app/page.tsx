'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StudentLayout } from '@/components/StudentLayout';

interface StudentMe {
  id: string;
  name: string;
  studentId: string;
  isAllowed: boolean;
  isConsumed: boolean;
  status: string;
}

export default function DashboardPage() {
  const [student, setStudent] = useState<StudentMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string, studentId: string, name: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string, studentId: string, name: string } | null>(null);
  const [transferring, setTransferring] = useState(false);

  // effect for searching
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await api.get<{ id: string, studentId: string, name: string }[]>(`/api/student/search?q=${searchQuery}`);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTransfer = async () => {
    if (!selectedStudent || transferring) return;
    setTransferring(true);
    try {
      await api.post('/api/student/transfer', { targetStudentId: selectedStudent.id });
      alert(`Meal transferred to ${selectedStudent.name} successfully!`);
      setSelectedStudent(null);
      setSearchQuery('');
      await load();
    } catch (e: any) {
      alert(e.message || 'Failed to transfer meal');
    } finally {
      setTransferring(false);
    }
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const me = await api.get<StudentMe>('/api/student/me');
      setStudent(me);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !student) {
    return (
      <StudentLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </StudentLayout>
    );
  }

  if (!student || error) {
    return (
      <StudentLayout>
        <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-in">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Session Error</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
            {error || 'We couldn\'t load your profile. Your session might be invalid or expired.'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={async () => {
              try {
                await api.post('/api/auth/logout');
              } catch (e) {}
              document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              window.location.href = '/login';
            }}
          >
            Clear Data & Login
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Welcome */}
      <div className="animate-in">
        <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>
          Hey, {student.name.split(' ')[0]} 👋
        </h1>

        {/* Meal Status Card */}
        <div className="glass-card" style={{ 
          padding: '30px 20px', 
          textAlign: 'center',
          borderColor: student.isAllowed ? 'rgba(45,212,191,0.4)' : 'rgba(244,63,94,0.4)',
          background: student.isAllowed ? 'linear-gradient(to bottom, rgba(45,212,191,0.05), transparent)' : 'linear-gradient(to bottom, rgba(244,63,94,0.05), transparent)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {student.isAllowed ? '🍽️' : '🛑'}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: student.isAllowed ? 'var(--teal)' : 'var(--red)' }}>
            Meal is {student.isAllowed ? 'ON' : 'OFF'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            {student.isAllowed 
              ? 'You are registered for the current meal session.' 
              : 'You are NOT registered for the current meal session.'}
          </p>
        </div>

        {/* Info */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span className={`badge ${student.isConsumed ? 'badge-green' : 'badge-muted'}`} style={{ padding: '6px 12px', fontSize: 13 }}>
            Status: {student.isConsumed ? 'CONSUMED ✓' : 'NOT CONSUMED'}
          </span>
        </div>

        {/* Transfer Meal Feature */}
        {student.isAllowed && !student.isConsumed && (
          <div className="glass-card" style={{ marginTop: 24, padding: '24px 20px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Transfer Meal</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Can't make it? Transfer your meal to another student.
            </p>
            
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Type Student ID or Name..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedStudent(null);
                }}
              />
              {searchResults.length > 0 && !selectedStudent && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  marginTop: 4,
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  maxHeight: 200, overflowY: 'auto'
                }}>
                  {searchResults.map(res => (
                    <div 
                      key={res.id} 
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      onClick={() => {
                        setSelectedStudent(res);
                        setSearchQuery(`${res.studentId} - ${res.name}`);
                        setSearchResults([]);
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{res.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {res.studentId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              className="btn btn-primary btn-full"
              disabled={!selectedStudent || transferring}
              onClick={handleTransfer}
            >
              {transferring ? 'Transferring...' : 'Transfer Meal'}
            </button>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
