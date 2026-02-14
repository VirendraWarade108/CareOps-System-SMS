// frontend/app/dashboard/team/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  permissions: {
    inbox: boolean;
    bookings: boolean;
    forms: boolean;
    inventory: boolean;
  };
  created_at: string;
}

export default function TeamPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // State for editing - store as object keyed by member ID
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<{[key: string]: any}>({});
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePermissions, setInvitePermissions] = useState({
    inbox: true,
    bookings: true,
    forms: true,
    inventory: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const workspaces = await api.get('/api/workspaces');
      if (workspaces.data.length > 0) {
        const ws = workspaces.data[0];
        setWorkspace(ws);
        
        const staffData = await api.get(`/api/workspaces/${ws.id}/staff`);
        setStaff(staffData.data);
      }
    } catch (err) {
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    
    setSaving(true);
    setError('');
    
    try {
      await api.post(`/api/workspaces/${workspace.id}/staff`, {
        email: inviteEmail,
        name: inviteName,
        permissions: invitePermissions
      });
      
      setSuccessMsg('Staff member invited successfully!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePermissions({
        inbox: true,
        bookings: true,
        forms: true,
        inventory: false
      });
      
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to invite staff member');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setEditPermissions({
      ...editPermissions,
      [member.id]: { ...member.permissions }
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdatePermissions = async (memberId: string) => {
    if (!workspace) return;
    
    setSaving(true);
    setError('');
    
    try {
      await api.patch(`/api/workspaces/${workspace.id}/staff/${memberId}`, {
        permissions: editPermissions[memberId]
      });
      
      setSuccessMsg('Permissions updated successfully!');
      setEditingId(null);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!workspace || !confirm('Are you sure you want to remove this team member?')) return;
    
    setSaving(true);
    setError('');
    
    try {
      await api.delete(`/api/workspaces/${workspace.id}/staff/${memberId}`);
      setSuccessMsg('Team member removed successfully!');
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove team member');
    } finally {
      setSaving(false);
    }
  };

  const updateEditPermission = (memberId: string, key: string, value: boolean) => {
    setEditPermissions({
      ...editPermissions,
      [memberId]: {
        ...editPermissions[memberId],
        [key]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notifications */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Team Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your team members and their permissions</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite Team Member
        </button>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">No team members yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Invite Team Member" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map((member) => {
            const isEditing = editingId === member.id;
            const currentPerms = isEditing ? editPermissions[member.id] : member.permissions;
            
            return (
              <div key={member.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                {/* Member Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-600">
                        {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">{member.full_name || 'No name'}</h3>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-slate-600 mb-2">Permissions:</p>
                  
                  {Object.entries(currentPerms || {}).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                      <span className="text-sm text-slate-700 capitalize">{key}</span>
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => isEditing && updateEditPermission(member.id, key, e.target.checked)}
                        disabled={!isEditing}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  ))}
                </div>

                {/* Actions */}
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdatePermissions(member.id)}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(member)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colleague@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                <div className="space-y-2">
                  {Object.entries(invitePermissions).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <span className="text-sm text-slate-700 capitalize">{key}</span>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setInvitePermissions({ ...invitePermissions, [key]: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}