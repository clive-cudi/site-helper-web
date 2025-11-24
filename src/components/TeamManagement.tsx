import { useState, useEffect } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { PermissionGuard } from './PermissionGuard';
import { supabase } from '../lib/supabase';
import type { Invitation } from '../lib/supabase';
import { Mail, UserPlus, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Role } from '../services/permissions';

interface UserProfile {
  id: string;
  email: string;
}

export function TeamManagement() {
  const { teamMembers, currentMember, refreshTeam, canManageRole } = useTeam();
  const { user } = useAuth();
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load user profiles for team members
  useEffect(() => {
    loadUserProfiles();
  }, [teamMembers]);

  // Load pending invitations
  useEffect(() => {
    if (currentMember) {
      loadInvitations();
    }
  }, [currentMember]);

  const loadUserProfiles = async () => {
    const userIds = teamMembers.map(tm => tm.user_id);
    if (userIds.length === 0) return;

    // Since we can't use admin API in client-side code,
    // we'll rely on the current user's email from auth context
    // For other users, we'll show a placeholder
    const profiles: Record<string, UserProfile> = {};
    
    // Try to get emails from Supabase auth (this will only work for admin users)
    for (const userId of userIds) {
      try {
        const { data: { user: userData } } = await supabase.auth.admin.getUserById(userId);
        if (userData) {
          profiles[userId] = {
            id: userId,
            email: userData.email || 'Unknown',
          };
        }
      } catch (err) {
        // If admin API not available, we'll need to handle this differently
        console.error('Error fetching user:', err);
      }
    }

    setUserProfiles(profiles);
  };

  const loadInvitations = async () => {
    if (!currentMember) return;

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('business_account_id', currentMember.business_account_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invitations:', error);
      return;
    }

    setInvitations(data || []);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!currentMember) {
      setError('Unable to send invitation');
      return;
    }

    setLoading(true);

    try {
      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Create invitation record
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          business_account_id: currentMember.business_account_id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user!.id,
          token,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
        });

      if (inviteError) {
        throw inviteError;
      }

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('editor');
      
      // Refresh invitations list
      await loadInvitations();
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    const member = teamMembers.find(tm => tm.id === memberId);
    if (!member) return;

    // Check if user can manage this role
    if (!canManageRole(newRole)) {
      setError('You do not have permission to assign this role');
      return;
    }

    // Confirm role change
    if (!window.confirm(`Are you sure you want to change this team member's role to ${newRole}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Role updated successfully');
      await refreshTeam();
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = teamMembers.find(tm => tm.id === memberId);
    if (!member) return;

    // Prevent removing owner
    if (member.role === 'owner') {
      setError('Cannot remove the account owner');
      return;
    }

    // Prevent removing self
    if (member.user_id === user?.id) {
      setError('Cannot remove yourself from the team');
      return;
    }

    // Confirm removal
    const userEmail = userProfiles[member.user_id]?.email || 'this user';
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from the team? They will lose all access immediately.`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess('Team member removed successfully');
      await refreshTeam();
    } catch (err: any) {
      console.error('Error removing team member:', err);
      setError(err.message || 'Failed to remove team member');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error: revokeError } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (revokeError) {
        throw revokeError;
      }

      setSuccess('Invitation revoked successfully');
      await loadInvitations();
    } catch (err: any) {
      console.error('Error revoking invitation:', err);
      setError(err.message || 'Failed to revoke invitation');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'owner':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'invited':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffMs = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <PermissionGuard permission="view_team">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your team members and their access levels
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-800">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Invitation Form */}
        <PermissionGuard permission="manage_team">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <UserPlus className="w-5 h-5" />
              <span>Invite Team Member</span>
            </h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Mail className="w-4 h-4" />
                <span>{loading ? 'Sending...' : 'Send Invitation'}</span>
              </button>
            </form>
          </div>
        </PermissionGuard>

        {/* Team Members List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {teamMembers.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const userEmail = userProfiles[member.user_id]?.email || user?.email || 'Loading...';
              const canEdit = member.role !== 'owner' && !isCurrentUser;

              return (
                <div
                  key={member.id}
                  className={`px-6 py-4 ${isCurrentUser ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {userEmail}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-blue-600 font-semibold">
                                  (You)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                member.role
                              )}`}
                            >
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                                member.status
                              )}`}
                            >
                              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                            </span>
                            {member.joined_at && (
                              <span className="text-xs text-gray-500">
                                Joined {formatDate(member.joined_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Role Change and Remove Actions */}
                    <PermissionGuard permission="manage_team">
                      <div className="flex items-center space-x-3">
                        {canEdit && (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                              disabled={loading}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            >
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                              {currentMember?.role === 'owner' && (
                                <option value="owner">Owner</option>
                              )}
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={loading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Remove team member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {member.role === 'owner' && (
                          <span className="text-xs text-gray-500 italic">Account Owner</span>
                        )}
                      </div>
                    </PermissionGuard>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Invitations */}
        <PermissionGuard permission="manage_team">
          {invitations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Pending Invitations</span>
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  
                  return (
                    <div key={invitation.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {invitation.email}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                    invitation.role
                                  )}`}
                                >
                                  {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                                </span>
                                <span
                                  className={`text-xs ${
                                    isExpired ? 'text-red-600' : 'text-gray-500'
                                  }`}
                                >
                                  {getTimeUntilExpiration(invitation.expires_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          disabled={loading}
                          className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </PermissionGuard>
      </div>
    </PermissionGuard>
  );
}
