import { useState } from "react";
import { Website } from "../lib/supabase";
import { X, Copy, Check } from "lucide-react";

type Props = {
  website: Website;
  onClose: () => void;
};

export function WidgetCodeModal({ website, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"vanilla" | "react" | "nextjs">(
    "vanilla"
  );

  const vanillaCode = `<script>
  const vanillaCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.setAttribute('data-website-id', '${website.id}');
    script.setAttribute('data-api-url', '${import.meta.env.VITE_SUPABASE_URL}');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

  const reactCode = `import { SiteHelperWidget } from './components/widget';

function App() {
  return (
    <div>
      {/* Your app content */}

      <SiteHelperWidget
        websiteId="${website.id}"
        apiUrl="${import.meta.env.VITE_SUPABASE_URL}"
        theme="${website.widget_config.theme}"
        primaryColor="${website.widget_config.primaryColor}"
        position="${website.widget_config.position}"
        greeting="${website.widget_config.greeting}"
      />
    </div>
  );
}`;

  const nextjsCode = `import { NextJsWidget } from './components/widget';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}

        <NextJsWidget
          websiteId="${website.id}"
          apiUrl="${import.meta.env.VITE_SUPABASE_URL}"
          theme="${website.widget_config.theme}"
          primaryColor="${website.widget_config.primaryColor}"
          position="${website.widget_config.position}"
          greeting="${website.widget_config.greeting}"
        />
      </body>
    </html>
  );
}`;

  const getActiveCode = () => {
    switch (activeTab) {
      case "react":
        return reactCode;
      case "nextjs":
        return nextjsCode;
      default:
        return vanillaCode;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Chat Widget Code
            </h2>
            <p className="text-sm text-gray-600 mt-1">{website.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab("vanilla")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "vanilla"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Vanilla JS
            </button>
            <button
              onClick={() => setActiveTab("react")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "react"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              React
            </button>
            <button
              onClick={() => setActiveTab("nextjs")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "nextjs"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Next.js
            </button>
          </div>

          <div>
            {activeTab === "vanilla" && (
              <p className="text-sm text-gray-700 mb-4">
                Copy and paste this code snippet into your website's HTML, just
                before the closing{" "}
                <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>{" "}
                tag:
              </p>
            )}
            {activeTab === "react" && (
              <div className="text-sm text-gray-700 mb-4 space-y-2">
                <p className="font-medium">
                  Step 1: Copy the widget components
                </p>
                <p>
                  Copy the files from{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    src/components/widget/
                  </code>{" "}
                  to your React project.
                </p>
                <p className="font-medium mt-3">
                  Step 2: Add the widget to your app
                </p>
              </div>
            )}
            {activeTab === "nextjs" && (
              <div className="text-sm text-gray-700 mb-4 space-y-2">
                <p className="font-medium">
                  Step 1: Copy the widget components
                </p>
                <p>
                  Copy the files from{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    src/components/widget/
                  </code>{" "}
                  to your Next.js project.
                </p>
                <p className="font-medium mt-3">
                  Step 2: Add the widget to your layout
                </p>
              </div>
            )}

            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-[300px]">
                <code>{getActiveCode()}</code>
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Widget Configuration
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>Theme: {website.widget_config.theme}</li>
              <li>Primary Color: {website.widget_config.primaryColor}</li>
              <li>Position: {website.widget_config.position}</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
