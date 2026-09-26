'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Trash2, UserPlus, Shield, User } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  avatar_id: string | null;
  created_at: string;
}

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagement({ isOpen, onClose }: UserManagementProps) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
  });
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && session?.user.role === 'ADMIN') {
      loadUsers();
    }
  }, [isOpen, session]);


  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      await loadUsers();
      setShowCreateForm(false);
      setFormData({ username: '', email: '', password: '', role: 'USER' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-overlay/40 dark:bg-overlay/60 p-4 sm:items-center sm:backdrop-blur-xs">
      <div className="dialog-panel flex w-full max-w-3xl flex-col rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4 sm:p-6">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">User Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-canvas rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showCreateForm ? (
            <form onSubmit={handleCreateUser} className="space-y-4 mb-6">
              <h3 className="mb-4 text-lg font-semibold text-ink">Create New User</h3>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1">
                  Username
                </label>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Enter password (min. 6 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' })}
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink focus:outline-hidden focus:ring-2 focus:ring-accent/30 sm:h-10 sm:text-sm"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {error && (
                <div className="bg-danger-soft border border-danger text-danger px-4 py-3 rounded-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" className="bg-accent hover:bg-accent-hover">
                  Create User
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ username: '', email: '', password: '', role: 'USER' });
                    setError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="mb-6 bg-accent hover:bg-accent-hover"
            >
              <UserPlus size={16} className="mr-2" />
              Add New User
            </Button>
          )}

          <div className="space-y-2">
            <h3 className="mb-4 text-lg font-semibold text-ink">
              Users ({users.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-ink-muted">Loading users...</div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-accent-ink">
                        {user.avatar_id ? (
                          <img
                            src={`/api/images/${user.avatar_id}`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </span>
                      <div>
                        <div className="font-medium text-ink">{user.username}</div>
                        <div className="text-sm text-ink-muted">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-accent-soft text-accent'
                          : 'bg-canvas text-ink-muted'
                      }`}>
                        {user.role === 'ADMIN' ? <Shield size={12} /> : <User size={12} />}
                        {user.role}
                      </div>

                      {session?.user.id !== user.id.toString() && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-danger hover:bg-danger-soft rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
