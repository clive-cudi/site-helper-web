import { useState, useEffect } from 'react';
import { supabase, Website, KnowledgeBase } from '../lib/supabase';
import { X, Loader2, Save } from 'lucide-react';

type Props = {
  website: Website;
  onClose: () => void;
};

export function KnowledgeBaseModal({ website, onClose }: Props) {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    loadKnowledgeBase();
  }, [website.id]);

  const loadKnowledgeBase = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('website_id', website.id)
        .maybeSingle();

      if (error) throw error;
      setKb(data);
      setEditedContent(data?.content || '');
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!kb) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ content: editedContent, updated_at: new Date().toISOString() })
        .eq('id', kb.id);

      if (error) throw error;
      alert('Knowledge base updated successfully');
    } catch (error) {
      console.error('Error saving knowledge base:', error);
      alert('Failed to save knowledge base');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
            <p className="text-sm text-gray-600 mt-1">{website.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : kb ? (
            <div className="space-y-4">
              {kb.summary && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                  <p className="text-blue-800 text-sm">{kb.summary}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Knowledge base content will appear here after scraping..."
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No knowledge base found
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !kb}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
