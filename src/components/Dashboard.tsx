import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { LogOut, Globe, MessageSquare, Settings, Users, BookOpen, BarChart3, LayoutDashboard } from 'lucide-react';
import { KnowledgeBaseWorkspace } from './KnowledgeBaseWorkspace';
import { ConversationList } from './ConversationList';
import { TeamManagement } from './TeamManagement';
import { SettingsPanel } from './SettingsPanel';
import { ReportsPanel } from './ReportsPanel';
import { OverviewPanel } from './OverviewPanel';
import type { Permission } from '../services/permissions';

type Tab = 'overview' | 'knowledge-base' | 'conversations' | 'reports' | 'team' | 'settings';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { hasPermission } = useTeam();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Define tabs with permission requirements
  const tabs = [
    {
      id: 'overview' as Tab,
      label: 'Overview',
      icon: LayoutDashboard,
      permission: null, // Always visible
    },
    {
      id: 'knowledge-base' as Tab,
      label: 'Knowledge Base',
      icon: BookOpen,
      permission: 'view_knowledge_bases' as Permission,
    },
    {
      id: 'conversations' as Tab,
      label: 'Conversations',
      icon: MessageSquare,
      permission: 'view_conversations' as Permission,
    },
    {
      id: 'reports' as Tab,
      label: 'Reports',
      icon: BarChart3,
      permission: 'view_conversations' as Permission,
    },
    {
      id: 'team' as Tab,
      label: 'Team',
      icon: Users,
      permission: 'view_team' as Permission,
    },
    {
      id: 'settings' as Tab,
      label: 'Settings',
      icon: Settings,
      permission: null, // Always visible
    },
  ];

  // Filter visible tabs based on user permissions
  const visibleTabs = tabs.filter(tab => 
    !tab.permission || hasPermission(tab.permission)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Globe className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">SiteHelper</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'overview' && <OverviewPanel />}
          {activeTab === 'knowledge-base' && <KnowledgeBaseWorkspace />}
          {activeTab === 'conversations' && <ConversationList />}
          {activeTab === 'reports' && <ReportsPanel />}
          {activeTab === 'team' && <TeamManagement />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}
