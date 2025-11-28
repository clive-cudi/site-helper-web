import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface InvitationDetails {
  email: string;
  role: string;
  business_account_id: string;
  business_name?: string;
  expires_at: string;
}

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Registration form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);

  // Fetch invitation details
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select(`
          email,
          role,
          business_account_id,
          expires_at,
          status,
          business_accounts (
            name
          )
        `)
        .eq('token', token)
        .single();

      if (fetchError || !data) {
        setError('Invitation not found or invalid');
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (data.status === 'accepted') {
        setError('This invitation has already been accepted');
        setLoading(false);
        return;
      }

      // Check if revoked
      if (data.status === 'revoked') {
        setError('This invitation has been revoked');
        setLoading(false);
        return;
      }

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (expiresAt < now || data.status === 'expired') {
        setError('This invitation has expired. Please request a new invitation from your team administrator.');
        setLoading(false);
        return;
      }

      setInvitation({
        email: data.email,
        role: data.role,
        business_account_id: data.business_account_id,
        business_name: (data.business_accounts as any)?.name,
        expires_at: data.expires_at,
      });
      setEmail(data.email);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation details');
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user || !token) return;

    try {
      setAccepting(true);
      setError('');

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setError('Authentication required. Please sign in again.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            token,
            userId: user.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400 && result.error?.includes('expired')) {
          setError('This invitation has expired. Please request a new invitation from your team administrator.');
        } else if (response.status === 404) {
          setError('Invitation not found or already used');
        } else {
          setError(result.error || 'Failed to accept invitation');
        }
        return;
      }

      setSuccess(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        await signUp(email, password);
        // After signup, the user will be authenticated and we can accept the invitation
        // The useEffect will trigger handleAcceptInvitation when user becomes available
      } else {
        await signIn(email, password);
        // After signin, same as above
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  // Auto-accept when user becomes authenticated
  useEffect(() => {
    if (user && invitation && !success && !accepting) {
      handleAcceptInvitation();
    }
  }, [user, invitation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invitation Accepted!
          </h1>
          <p className="text-gray-600 mb-4">
            You've successfully joined the team. Redirecting to dashboard...
          </p>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!user && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Team Invitation
            </h1>
            <p className="text-gray-600">
              You've been invited to join{' '}
              <span className="font-semibold">
                {invitation.business_name || 'a team'}
              </span>{' '}
              as <span className="font-semibold capitalize">{invitation.role}</span>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Complete registration to accept</p>
                <p>
                  {isSignUp 
                    ? 'Create an account to join the team'
                    : 'Sign in to your existing account to accept this invitation'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!isSignUp}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={accepting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Processing...' : isSignUp ? 'Sign Up & Accept' : 'Sign In & Accept'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user && invitation && accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accepting Invitation...
          </h2>
          <p className="text-gray-600">
            Please wait while we add you to the team.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
