import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  Search, 
  Trash2, 
  Check, 
  X, 
  ShieldAlert, 
  Users, 
  Shield, 
  UserMinus,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';

export default function SuperAdminConsole() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Action state (to show loading spinners on specific buttons if needed)
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch users.');
      }
    } catch (err) {
      setError('Connection error fetching users.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/auth/approve-signup/${id}`, { method: 'POST' });
      if (res.ok) {
        setSuccess('User approved successfully.');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to approve user.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this signup request?')) return;
    setActionId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/auth/reject-signup/${id}`, { method: 'POST' });
      if (res.ok) {
        setSuccess('User rejected successfully.');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reject user.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setActionId(null);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/auth/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'User role updated successfully.');
        // Update local state without full reload
        setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u));
      } else {
        setError(data.error || 'Failed to update user role.');
      }
    } catch (err) {
      setError('Connection error updating role.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete user "${name}"? This action cannot be undone.`)) {
      return;
    }
    setActionId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'User deleted successfully.');
        setUsers(users.filter(u => u._id !== id));
      } else {
        setError(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      setError('Connection error deleting user.');
    } finally {
      setActionId(null);
    }
  };

  // Helper displays
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SuperAdmin': return 'Super Admin';
      case 'FleetManager': return 'Fleet Manager';
      case 'Dispatcher': return 'Dispatcher';
      case 'SafetyOfficer': return 'Safety Officer';
      case 'FinancialAnalyst': return 'Financial Analyst';
      default: return role;
    }
  };

  // Filtering users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? u.accountStatus === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.accountStatus === 'Active').length;
  const pendingUsers = users.filter(u => u.accountStatus === 'PendingApproval').length;
  const rejectedUsers = users.filter(u => u.accountStatus === 'Rejected').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield style={{ color: '#f59e0b', width: '28px', height: '28px' }} />
            Super Admin Console
          </h1>
          <p>Global user database management, signup approvals, and role configuration controls.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading} style={{ display: 'flex', gap: '8px' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Reload Database
        </button>
      </div>

      {/* Alert Notices */}
      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '12px 16px', color: '#10b981', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} />
          {success}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid-metrics">
        <div className="card-metric" style={{ borderLeft: '3px solid #64748b' }}>
          <span className="metric-title">Total Registered Accounts</span>
          <span className="metric-value">{totalUsers}</span>
          <span className="metric-footer">Across all authorization scopes</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #10b981' }}>
          <span className="metric-title">Active Accounts</span>
          <span className="metric-value" style={{ color: '#10b981' }}>{activeUsers}</span>
          <span className="metric-footer">Users currently authorized</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #f59e0b' }}>
          <span className="metric-title">Pending Approvals</span>
          <span className="metric-value" style={{ color: '#f59e0b' }}>{pendingUsers}</span>
          <span className="metric-footer">Awaiting verification</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #ef4444' }}>
          <span className="metric-title">Rejected Access Requests</span>
          <span className="metric-value" style={{ color: '#ef4444' }}>{rejectedUsers}</span>
          <span className="metric-footer">Denied registration</span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="card-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
        <div className="topbar-search" style={{ width: '320px', minWidth: '240px' }}>
          <Search />
          <input 
            type="text" 
            placeholder="Search by name, email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <select 
            className="form-control" 
            style={{ width: '180px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Role Scope: All</option>
            <option value="SuperAdmin">Super Admin</option>
            <option value="FleetManager">Fleet Manager</option>
            <option value="Dispatcher">Dispatcher</option>
            <option value="SafetyOfficer">Safety Officer</option>
            <option value="FinancialAnalyst">Financial Analyst</option>
          </select>

          <select 
            className="form-control" 
            style={{ width: '180px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Status: All</option>
            <option value="Active">Active</option>
            <option value="PendingApproval">Pending Approval</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Database Table */}
      {loading ? (
        <div style={{ display: 'flex', height: '30vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-dot"></div>
          <span style={{ color: '#94a3b8', marginLeft: '8px' }}>Scanning credentials database...</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Database ID</th>
                <th>Assigned Role Scope</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Authorization Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => {
                  const isSelf = u._id === currentUser?.id;
                  
                  return (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="user-avatar" style={{ 
                            width: '36px', 
                            height: '36px', 
                            fontSize: '12px',
                            backgroundColor: isSelf ? '#f59e0b' : '#334155',
                            color: isSelf ? '#080c14' : '#f8fafc',
                            fontWeight: 600
                          }}>
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {u.name}
                              {isSelf && <span style={{ fontSize: '10px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 6px', borderRadius: '4px' }}>You</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                        {u._id}
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="user-badge" style={{ fontSize: '12px' }}>{getRoleBadge(u.role)}</span>
                        ) : (
                          <select
                            className="form-control"
                            style={{ padding: '6px 12px', fontSize: '13px', width: '180px', height: 'auto', backgroundColor: 'var(--bg-primary)' }}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          >
                            <option value="SuperAdmin">Super Admin</option>
                            <option value="FleetManager">Fleet Manager</option>
                            <option value="Dispatcher">Dispatcher</option>
                            <option value="SafetyOfficer">Safety Officer</option>
                            <option value="FinancialAnalyst">Financial Analyst</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          u.accountStatus === 'Active' ? 'badge-completed' :
                          u.accountStatus === 'PendingApproval' ? 'badge-in-shop' :
                          'badge-retired'
                        }`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {u.accountStatus === 'Active' && <span className="pulse-dot" style={{ backgroundColor: '#10b981', width: '6px', height: '6px', margin: '0 6px 0 0' }} />}
                          {u.accountStatus === 'PendingApproval' && <span className="pulse-dot" style={{ backgroundColor: '#f59e0b', width: '6px', height: '6px', margin: '0 6px 0 0' }} />}
                          {u.accountStatus === 'Rejected' && <span className="pulse-dot" style={{ backgroundColor: '#ef4444', width: '6px', height: '6px', margin: '0 6px 0 0' }} />}
                          {u.accountStatus === 'PendingApproval' ? 'Pending Approval' : u.accountStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {u.accountStatus === 'PendingApproval' && (
                            <>
                              <button
                                className="btn btn-secondary btn-icon"
                                title="Approve Registration"
                                onClick={() => handleApprove(u._id)}
                                disabled={actionId === u._id}
                                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="btn btn-secondary btn-icon"
                                title="Reject Registration"
                                onClick={() => handleReject(u._id)}
                                disabled={actionId === u._id}
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          
                          <button
                            className="btn btn-secondary btn-icon"
                            title={isSelf ? 'Cannot delete yourself' : 'Delete User Account'}
                            onClick={() => handleDelete(u._id, u.name)}
                            disabled={isSelf || actionId === u._id}
                            style={{ 
                              color: isSelf ? '#475569' : '#ef4444', 
                              borderColor: isSelf ? 'transparent' : 'rgba(239, 68, 68, 0.2)', 
                              backgroundColor: isSelf ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                              cursor: isSelf ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No users match search or filter constraints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
