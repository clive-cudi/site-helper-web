import { useState, useEffect } from 'react';
import { supabase, Website } from '../lib/supabase';
import { Plus, Trash2, Eye, Code, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { AddWebsiteModal } from './AddWebsiteModal';
import { KnowledgeBaseModal } from './KnowledgeBaseModal';
import { WidgetCodeModal } from './WidgetCodeModal';

export function WebsiteList() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showWidgetCode, setShowWidgetCode] = useState(false);

  useEffect(() => {
    loadWebsites();
  }, []);

  const loadWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error) {
      console.error('Error loading websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this website?')) return;

    try {
      const { error } = await supabase.from('websites').delete().eq('id', id);
      if (error) throw error;
      setWebsites(websites.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting website:', error);
      alert('Failed to delete website');
    }
  };

  const getStatusIcon = (status: Website['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Your Websites</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Website</span>
          </button>
        </div>

        {websites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No websites yet</h3>
            <p className="text-gray-600 mb-6">Add your first website to get started with AI assistance</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Your First Website</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {websites.map((website) => (
              <div key={website.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{website.name}</h3>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate block"
                    >
                      {website.url}
                    </a>
                  </div>
                  {getStatusIcon(website.status)}
                </div>

                <div className="mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    website.status === 'completed' ? 'bg-green-100 text-green-800' :
                    website.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    website.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {website.status}
                  </span>
                </div>

                {website.scrape_error && (
                  <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {website.scrape_error}
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedWebsite(website);
                      setShowKnowledgeBase(true);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View KB</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWebsite(website);
                      setShowWidgetCode(true);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Code className="w-4 h-4" />
                    <span>Widget</span>
                  </button>
                  <button
                    onClick={() => handleDelete(website.id)}
                    className="flex items-center justify-center px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddWebsiteModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadWebsites();
          }}
        />
      )}

      {showKnowledgeBase && selectedWebsite && (
        <KnowledgeBaseModal
          website={selectedWebsite}
          onClose={() => {
            setShowKnowledgeBase(false);
            setSelectedWebsite(null);
          }}
        />
      )}

      {showWidgetCode && selectedWebsite && (
        <WidgetCodeModal
          website={selectedWebsite}
          onClose={() => {
            setShowWidgetCode(false);
            setSelectedWebsite(null);
          }}
        />
      )}
    </>
  );
}
