import { useState, useEffect } from 'react';
import { supabase, Conversation, Website } from '../lib/supabase';
import { Loader2, MessageSquare, ExternalLink, Trash2 } from 'lucide-react';
import { ConversationDetailModal } from './ConversationDetailModal';
import { useTeam } from '../contexts/TeamContext';
import { PermissionGuard } from './PermissionGuard';

type ConversationWithWebsite = Conversation & {
  website: Website;
  message_count: number;
};

export function ConversationList() {
  const { businessAccount } = useTeam();
  const [conversations, setConversations] = useState<ConversationWithWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (businessAccount) {
      loadConversations();
    }
  }, [businessAccount]);

  const loadConversations = async () => {
    try {
      // Query conversations through websites that belong to the business account
      // RLS policies will automatically filter websites by business_account_id
      const { data: websites, error: websitesError } = await supabase
        .from('websites')
        .select('id');

      if (websitesError) throw websitesError;

      const websiteIds = websites?.map(w => w.id) || [];

      if (websiteIds.length === 0) {
        setLoading(false);
        return;
      }

      // Query conversations for the business account's websites
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          *,
          website:websites(*)
        `)
        .in('website_id', websiteIds)
        .order('last_message_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      const conversationsWithCount = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          return {
            ...conv,
            message_count: count || 0
          };
        })
      );

      setConversations(conversationsWithCount as ConversationWithWebsite[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the conversation detail modal

    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(conversationId);

      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Conversations</h2>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-600">Conversations will appear here once visitors start using your chat widget</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="flex items-center hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => setSelectedConversation(conversation)}
                  className="flex-1 p-4 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {conversation.website.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          Visitor {conversation.visitor_id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {conversation.message_count} messages
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {formatDate(conversation.last_message_at)}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </button>
                
                <PermissionGuard permission="delete_conversations">
                  <div className="px-4">
                    <button
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      disabled={deletingId === conversation.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete conversation"
                    >
                      {deletingId === conversation.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </PermissionGuard>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedConversation && (
        <ConversationDetailModal
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </>
  );
}
