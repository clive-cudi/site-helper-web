import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Globe,
  Loader2,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Users,
  FileText,
} from "lucide-react";
import { useTeam } from "../contexts/TeamContext";
import { supabase } from "../lib/supabase";
import { getOrCreateCanonicalWebsite } from "../services/website";

type OverviewStats = {
  websiteUrl: string | null;
  hasWebsite: boolean;
  kbChars: number;
  kbLastUpdated: string | null;
  conversationsTotal: number;
  conversationsLast24h: number;
  messagesTotal: number;
  teamMembersTotal: number;
  pendingInvites: number;
  conversationsTrend7d: number[];
  messagesTrend7d: number[];
};

function formatDate(date: string | null): string {
  if (!date) return "Not available";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((value, idx) => {
      const x = idx * stepX;
      const normalized = (value - min) / range;
      const y = height - normalized * height;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 110;
  const height = 30;
  const path = buildSparklinePath(values, width, height);
  const max = Math.max(...values, 1);
  const latest = values[values.length - 1] ?? 0;

  return (
    <div className="mt-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-xs text-gray-500 mt-1">
        7-day trend · latest {latest} / peak {max}
      </p>
    </div>
  );
}

export function OverviewPanel() {
  const { businessAccount, teamMembers, hasPermission } = useTeam();
  const canViewConversations = hasPermission("view_conversations");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<OverviewStats | null>(null);

  const loadOverview = useCallback(async () => {
    if (!businessAccount) return;

    try {
      setLoading(true);
      setError("");

      const website = await getOrCreateCanonicalWebsite(businessAccount, {
        createIfMissing: false,
      });

      if (!website) {
        const { count: pendingInvitesCount } = await supabase
          .from("invitations")
          .select("*", { count: "exact", head: true })
          .eq("business_account_id", businessAccount.id)
          .eq("status", "pending");

        setStats({
          websiteUrl: null,
          hasWebsite: false,
          kbChars: 0,
          kbLastUpdated: null,
          conversationsTotal: 0,
          conversationsLast24h: 0,
          messagesTotal: 0,
          teamMembersTotal: teamMembers.length,
          pendingInvites: pendingInvitesCount || 0,
          conversationsTrend7d: [0, 0, 0, 0, 0, 0, 0],
          messagesTrend7d: [0, 0, 0, 0, 0, 0, 0],
        });
        return;
      }

      const { data: kbData, error: kbError } = await supabase
        .from("knowledge_bases")
        .select("content, updated_at")
        .eq("website_id", website.id)
        .maybeSingle();

      if (kbError) throw kbError;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let conversationsTotal = 0;
      let conversationsLast24h = 0;
      let messagesTotal = 0;
      let conversationsTrend7d = [0, 0, 0, 0, 0, 0, 0];
      let messagesTrend7d = [0, 0, 0, 0, 0, 0, 0];

      if (canViewConversations) {
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [{ count: allCount }, { count: dayCount }] = await Promise.all([
          supabase
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("website_id", website.id),
          supabase
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("website_id", website.id)
            .gte("started_at", last24h.toISOString()),
        ]);

        conversationsTotal = allCount || 0;
        conversationsLast24h = dayCount || 0;

        const { data: conversationIdsRows, error: conversationsError } =
          await supabase
            .from("conversations")
            .select("id, started_at")
            .eq("website_id", website.id)
            .gte("started_at", last7d.toISOString());

        if (conversationsError) throw conversationsError;

        const conversationRows = conversationIdsRows || [];
        const conversationIds = conversationRows.map((c) => c.id);

        const dayKeyToIdx = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - i);
          dayKeyToIdx.set(d.toISOString().slice(0, 10), 6 - i);
        }

        for (const conv of conversationRows) {
          const key = new Date(conv.started_at).toISOString().slice(0, 10);
          const idx = dayKeyToIdx.get(key);
          if (idx !== undefined) conversationsTrend7d[idx] += 1;
        }

        if (conversationIds.length > 0) {
          const { count: messageCount, error: messagesError } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .in("conversation_id", conversationIds);

          if (messagesError) throw messagesError;
          messagesTotal = messageCount || 0;

          const { data: recentMessages, error: recentMessagesError } =
            await supabase
              .from("messages")
              .select("created_at")
              .in("conversation_id", conversationIds)
              .gte("created_at", last7d.toISOString());

          if (recentMessagesError) throw recentMessagesError;
          for (const msg of recentMessages || []) {
            const key = new Date(msg.created_at).toISOString().slice(0, 10);
            const idx = dayKeyToIdx.get(key);
            if (idx !== undefined) messagesTrend7d[idx] += 1;
          }
        }
      }

      const { count: pendingInvitesCount } = await supabase
        .from("invitations")
        .select("*", { count: "exact", head: true })
        .eq("business_account_id", businessAccount.id)
        .eq("status", "pending");

      setStats({
        websiteUrl: website.url,
        hasWebsite: true,
        kbChars: kbData?.content?.length || 0,
        kbLastUpdated: kbData?.updated_at || null,
        conversationsTotal,
        conversationsLast24h,
        messagesTotal,
        teamMembersTotal: teamMembers.length,
        pendingInvites: pendingInvitesCount || 0,
        conversationsTrend7d,
        messagesTrend7d,
      });
    } catch (loadError) {
      console.error("Error loading overview:", loadError);
      setError("Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  }, [businessAccount, canViewConversations, teamMembers.length]);

  useEffect(() => {
    if (businessAccount) {
      void loadOverview();
    } else {
      setLoading(false);
    }
  }, [businessAccount, loadOverview]);

  const cards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: "Website URL",
        value: stats.websiteUrl || "Not configured",
        icon: Globe,
      },
      {
        label: "Knowledge Base Size",
        value: `${stats.kbChars.toLocaleString()} chars`,
        icon: FileText,
      },
      {
        label: "Conversations (All Time)",
        value: canViewConversations
          ? stats.conversationsTotal.toLocaleString()
          : "Restricted",
        icon: MessageSquare,
        sparkline:
          canViewConversations ? (
            <Sparkline values={stats.conversationsTrend7d} color="#2563eb" />
          ) : null,
      },
      {
        label: "Conversations (24h)",
        value: canViewConversations
          ? stats.conversationsLast24h.toLocaleString()
          : "Restricted",
        icon: MessageCircle,
      },
      {
        label: "Messages (All Time)",
        value: canViewConversations
          ? stats.messagesTotal.toLocaleString()
          : "Restricted",
        icon: MessageSquare,
        sparkline:
          canViewConversations ? (
            <Sparkline values={stats.messagesTrend7d} color="#0891b2" />
          ) : null,
      },
      {
        label: "Team Members",
        value: stats.teamMembersTotal.toLocaleString(),
        icon: Users,
      },
      {
        label: "Pending Invites",
        value: stats.pendingInvites.toLocaleString(),
        icon: Users,
      },
    ];
  }, [canViewConversations, stats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <button
            onClick={() => void loadOverview()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        <p className="text-sm text-gray-600">
          At-a-glance statistics and key business information for your support setup.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-2 text-gray-600">
                    <Icon className="w-4 h-4" />
                    <p className="text-sm">{card.label}</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 break-words">
                    {card.value}
                  </p>
                  {"sparkline" in card && card.sparkline}
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Setup Status
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                Website configured: {stats.hasWebsite ? "Yes" : "No"}
              </li>
              <li>
                Knowledge base last updated: {formatDate(stats.kbLastUpdated)}
              </li>
              <li>
                Conversation visibility:{" "}
                {canViewConversations ? "Enabled" : "Restricted by role"}
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
