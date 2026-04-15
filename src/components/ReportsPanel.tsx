import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { useTeam } from "../contexts/TeamContext";
import { supabase, type Conversation, type Message } from "../lib/supabase";
import { getOrCreateCanonicalWebsite } from "../services/website";

type ReportRange = "daily" | "weekly";

type FAQItem = {
  question: string;
  count: number;
};

type ReportData = {
  range: ReportRange;
  fromISO: string;
  toISO: string;
  conversations: Conversation[];
  messages: Message[];
  faq: FAQItem[];
  uniqueVisitors: number;
  avgMessagesPerConversation: number;
  avgFirstResponseMinutes: number | null;
};

function rangeLabel(range: ReportRange): string {
  return range === "daily" ? "Daily" : "Weekly";
}

function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatQuestionForDisplay(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentence = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return sentence.endsWith("?") ? sentence : `${sentence}?`;
}

function buildReportSummary(report: ReportData): string {
  const totalConversations = report.conversations.length;
  const totalMessages = report.messages.length;
  const userMessages = report.messages.filter((m) => m.role === "user").length;
  const assistantMessages = report.messages.filter(
    (m) => m.role === "assistant"
  ).length;

  const topFaqText =
    report.faq.length === 0
      ? "No recurring customer questions were detected in this period."
      : report.faq
          .slice(0, 5)
          .map((item, idx) => `${idx + 1}. ${item.question} (${item.count})`)
          .join("\n");

  const responseTimeText =
    report.avgFirstResponseMinutes === null
      ? "Not enough data to compute first response time."
      : `${report.avgFirstResponseMinutes.toFixed(1)} minutes`;

  const fromDate = new Date(report.fromISO).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const toDate = new Date(report.toISO).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    `${rangeLabel(report.range)} Report (${fromDate} to ${toDate})`,
    "",
    `- Total conversations: ${totalConversations}`,
    `- Total messages: ${totalMessages}`,
    `- Customer messages: ${userMessages}`,
    `- Assistant messages: ${assistantMessages}`,
    `- Unique visitors: ${report.uniqueVisitors}`,
    `- Average messages per conversation: ${report.avgMessagesPerConversation.toFixed(1)}`,
    `- Average first assistant response: ${responseTimeText}`,
    "",
    "Top Frequently Asked Questions:",
    topFaqText,
  ].join("\n");
}

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function ReportsPanel() {
  const { businessAccount, hasPermission } = useTeam();
  const canViewConversations = hasPermission("view_conversations");
  const [range, setRange] = useState<ReportRange>("daily");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);

  const loadReport = useCallback(async () => {
    if (!businessAccount) return;

    try {
      setLoading(true);
      setError("");

      const website = await getOrCreateCanonicalWebsite(businessAccount, {
        createIfMissing: false,
      });

      if (!website) {
        setReport(null);
        setLoading(false);
        return;
      }

      const now = new Date();
      const from = new Date(now);
      if (range === "daily") {
        from.setDate(now.getDate() - 1);
      } else {
        from.setDate(now.getDate() - 7);
      }

      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("*")
        .eq("website_id", website.id)
        .gte("started_at", from.toISOString())
        .lte("started_at", now.toISOString())
        .order("started_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      const conversationList = conversations || [];
      const conversationIds = conversationList.map((c) => c.id);

      let messages: Message[] = [];
      if (conversationIds.length > 0) {
        const { data: messageRows, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;
        messages = messageRows || [];
      }

      const uniqueVisitors = new Set(conversationList.map((c) => c.visitor_id))
        .size;
      const avgMessagesPerConversation =
        conversationList.length === 0
          ? 0
          : messages.length / conversationList.length;

      const faqMap = new Map<string, { display: string; count: number }>();
      for (const message of messages) {
        if (message.role !== "user") continue;
        if (message.content.trim().length < 4) continue;
        const normalized = normalizeQuestion(message.content);
        if (!normalized) continue;
        const display = formatQuestionForDisplay(message.content);
        const existing = faqMap.get(normalized);
        if (existing) {
          existing.count += 1;
        } else {
          faqMap.set(normalized, { display, count: 1 });
        }
      }

      const faq = Array.from(faqMap.values())
        .filter((item) => item.count > 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item) => ({ question: item.display, count: item.count }));

      const messagesByConversation = new Map<string, Message[]>();
      for (const msg of messages) {
        const list = messagesByConversation.get(msg.conversation_id) || [];
        list.push(msg);
        messagesByConversation.set(msg.conversation_id, list);
      }

      const responseTimes: number[] = [];
      for (const conv of conversationList) {
        const convMessages = messagesByConversation.get(conv.id) || [];
        const firstUser = convMessages.find((m) => m.role === "user");
        const firstAssistant = convMessages.find((m) => m.role === "assistant");
        if (!firstUser || !firstAssistant) continue;
        const deltaMs =
          new Date(firstAssistant.created_at).getTime() -
          new Date(firstUser.created_at).getTime();
        if (deltaMs >= 0) {
          responseTimes.push(deltaMs / 60000);
        }
      }

      const avgFirstResponseMinutes =
        responseTimes.length === 0
          ? null
          : responseTimes.reduce((sum, n) => sum + n, 0) / responseTimes.length;

      setReport({
        range,
        fromISO: from.toISOString(),
        toISO: now.toISOString(),
        conversations: conversationList,
        messages,
        faq,
        uniqueVisitors,
        avgMessagesPerConversation,
        avgFirstResponseMinutes,
      });
    } catch (loadError) {
      console.error("Error loading report:", loadError);
      setError("Failed to generate report for the selected period.");
    } finally {
      setLoading(false);
    }
  }, [businessAccount, range]);

  useEffect(() => {
    if (businessAccount && canViewConversations) {
      void loadReport();
    } else {
      setLoading(false);
    }
  }, [businessAccount, canViewConversations, loadReport]);

  const summary = useMemo(() => {
    if (!report) return "";
    return buildReportSummary(report);
  }, [report]);

  const handleExportCsv = () => {
    if (!report) return;

    const rows: string[][] = [];
    rows.push(["Report Type", rangeLabel(report.range)]);
    rows.push(["From", report.fromISO]);
    rows.push(["To", report.toISO]);
    rows.push(["Conversations", String(report.conversations.length)]);
    rows.push(["Total Messages", String(report.messages.length)]);
    rows.push(["Unique Visitors", String(report.uniqueVisitors)]);
    rows.push([
      "Average Messages Per Conversation",
      report.avgMessagesPerConversation.toFixed(2),
    ]);
    rows.push([
      "Average First Response (minutes)",
      report.avgFirstResponseMinutes === null
        ? "-"
        : report.avgFirstResponseMinutes.toFixed(2),
    ]);
    rows.push([]);
    rows.push(["Top FAQs"]);
    rows.push(["Question", "Mentions"]);
    for (const faq of report.faq) {
      rows.push([faq.question, String(faq.count)]);
    }

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `sitehelper-${report.range}-report-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!report) return;

    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) return;

    const faqRows =
      report.faq.length === 0
        ? "<tr><td colspan='2'>No repeated customer questions found.</td></tr>"
        : report.faq
            .map(
              (item) =>
                `<tr><td>${item.question}</td><td style="text-align:right;">${item.count}</td></tr>`
            )
            .join("");

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>SiteHelper ${rangeLabel(report.range)} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1, h2 { margin: 0 0 12px; }
            .meta { margin-bottom: 20px; color: #4b5563; font-size: 14px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 20px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 14px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; }
            pre { white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>SiteHelper ${rangeLabel(report.range)} Report</h1>
          <div class="meta">From ${new Date(report.fromISO).toLocaleString()} to ${new Date(report.toISO).toLocaleString()}</div>

          <div class="grid">
            <div class="card"><strong>Conversations</strong><div>${report.conversations.length}</div></div>
            <div class="card"><strong>Total Messages</strong><div>${report.messages.length}</div></div>
            <div class="card"><strong>Unique Visitors</strong><div>${report.uniqueVisitors}</div></div>
            <div class="card"><strong>Avg First Response</strong><div>${report.avgFirstResponseMinutes === null ? "-" : `${report.avgFirstResponseMinutes.toFixed(1)} minutes`}</div></div>
          </div>

          <h2>Frequently Asked Questions</h2>
          <table>
            <thead>
              <tr><th>Question</th><th>Mentions</th></tr>
            </thead>
            <tbody>
              ${faqRows}
            </tbody>
          </table>

          <h2 style="margin-top:20px;">Generated Summary</h2>
          <pre>${summary.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  if (!canViewConversations) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports</h2>
        <p className="text-gray-600">
          You do not have permission to view customer interaction reports.
        </p>
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as ReportRange)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
            </select>
            <button
              onClick={handleExportCsv}
              disabled={!report}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!report}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() => void loadReport()}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Generate clear interaction summaries and identify frequently asked customer questions.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!report ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No report data available
          </h3>
          <p className="text-gray-600">
            Add a website and collect conversations to generate reports.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Conversations</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.conversations.length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.messages.length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.uniqueVisitors}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Avg. First Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.avgFirstResponseMinutes === null
                  ? "-"
                  : `${report.avgFirstResponseMinutes.toFixed(1)}m`}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Frequently Asked Questions
            </h3>
            {report.faq.length === 0 ? (
              <p className="text-sm text-gray-600">
                No repeated customer questions detected for this period yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {report.faq.map((item, idx) => (
                  <li
                    key={`${item.question}-${idx}`}
                    className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-800">{item.question}</span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                      {item.count} mentions
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Generated {rangeLabel(report.range)} Report
            </h3>
            <textarea
              value={summary}
              readOnly
              rows={14}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 font-mono bg-gray-50"
            />
          </div>
        </>
      )}
    </div>
  );
}
