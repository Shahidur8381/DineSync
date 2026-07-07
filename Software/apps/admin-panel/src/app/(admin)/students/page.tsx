'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Card {
  id: string;
  uid: string;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  status: string;
  mealStatus: { isAllowed: boolean; isConsumed: boolean }[];
  cards: Card[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const data = await api.get<{ data: Student[]; total: number }>(`/api/admin/students?${params}`);
      setStudents(data.data);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    await api.delete(`/api/admin/students/${id}`);
    load();
  };

  const toggleMealStatus = async (studentId: string, currentAllowed: boolean) => {
    try {
      await api.put(`/api/admin/students/${studentId}/meal-status`, { isAllowed: !currentAllowed });
      load();
    } catch (err) {
      alert('Failed to update meal status');
    }
  };

  const toggleConsumedStatus = async (studentId: string, currentConsumed: boolean) => {
    try {
      await api.put(`/api/admin/students/${studentId}/meal-status`, { isConsumed: !currentConsumed });
      load();
    } catch (err) {
      alert('Failed to update consumed status');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{total} registered students</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditStudent(null); setShowModal(true); }}>
          + Add Student
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          id="student-search"
          className="form-input"
          placeholder="Search by name, email, or student ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>RFID Card</th>
                <th>Meal Active (ON/OFF)</th>
                <th>Consumed?</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No students found</td></tr>
              ) : students.map((s) => {
                const isAllowed = s.mealStatus && s.mealStatus.length > 0 ? s.mealStatus[0].isAllowed : true;
                const isConsumed = s.mealStatus && s.mealStatus.length > 0 ? s.mealStatus[0].isConsumed : false;
                const rfidUid = s.cards && s.cards.length > 0 ? s.cards[0].uid : null;

                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                    </td>
                    <td><span className="badge badge-muted">{s.studentId}</span></td>
                    <td>
                      {rfidUid ? (
                        <span className="badge badge-muted" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                          {rfidUid}
                        </span>
                      ) : (
                        <span className="badge badge-red">Not Assigned</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMealStatus(s.id, isAllowed)}
                        className={`badge ${isAllowed ? 'badge-green' : 'badge-red'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="Click to toggle meal ON or OFF"
                      >
                        {isAllowed ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleConsumedStatus(s.id, isConsumed)}
                        className={`badge ${isConsumed ? 'badge-muted' : 'badge-green'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="Click to toggle consumed status"
                      >
                        {isConsumed ? 'Consumed' : 'Waiting'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditStudent(s); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination" style={{ padding: '12px 20px' }}>
          <span>Page {page} of {totalPages || 1} ({total} total)</span>
          <div className="pagination-controls">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>

      {showModal && (
        <StudentModal
          student={editStudent}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function StudentModal({
  student, onClose, onSave,
}: {
  student: Student | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const currentRfid = student?.cards && student.cards.length > 0 ? student.cards[0].uid : '';

  const [form, setForm] = useState({
    studentId: student?.studentId || '',
    name: student?.name || '',
    email: student?.email || '',
    password: '',
    rfid: currentRfid,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (student) {
        // Update basic info
        await api.put(`/api/admin/students/${student.id}`, {
          name: form.name,
          email: form.email,
        });

        // Update RFID if provided
        const trimmedRfid = form.rfid.trim();
        if (trimmedRfid && trimmedRfid !== currentRfid) {
          await api.put(`/api/admin/students/${student.id}/rfid`, { uid: trimmedRfid });
        }
      } else {
        const newStudent = await api.post<{ id: string }>('/api/admin/students', {
          studentId: form.studentId,
          name: form.name,
          email: form.email,
          password: form.password,
        });

        // Assign RFID if provided for new student
        const trimmedRfid = form.rfid.trim();
        if (trimmedRfid && newStudent?.id) {
          await api.put(`/api/admin/students/${newStudent.id}/rfid`, { uid: trimmedRfid });
        }
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{student ? 'Edit Student' : 'Add Student'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {!student && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="s-studentId">Student ID</label>
                <input id="s-studentId" className="form-input" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="s-password">Password</label>
                <input id="s-password" type="password" className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="s-name">Full Name</label>
            <input id="s-name" className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="s-email">Email</label>
            <input id="s-email" type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="s-rfid">RFID Card UID</label>
            <input
              id="s-rfid"
              className="form-input"
              placeholder="e.g. 23 10 63 A6"
              value={form.rfid}
              onChange={e => setForm(f => ({ ...f, rfid: e.target.value }))}
              style={{ fontFamily: 'monospace' }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Leave blank to skip RFID assignment.
            </p>
          </div>
          {error && <div className="alert-banner alert-banner-critical">{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : student ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
