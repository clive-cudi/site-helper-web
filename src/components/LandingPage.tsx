import { Bot, Globe, MessageSquare, Zap, Shield, BarChart3 } from 'lucide-react';

type Props = {
  onGetStarted: () => void;
};

export function LandingPage({ onGetStarted }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Globe className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">SiteHelper</span>
            </div>
            <button
              onClick={onGetStarted}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered Website Assistant for Your Business
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your website into a 24/7 customer support hub. SiteHelper automatically learns from your website content and provides instant, accurate answers to visitor questions.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-lg flex items-center space-x-2"
            >
              <span>Start Free Trial</span>
            </button>
            <a
              href="#features"
              className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-colors font-medium text-lg"
            >
              Learn More
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20" id="features">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Setup</h3>
            <p className="text-gray-600">
              Add your website URL and our AI automatically extracts and analyzes your content to create a comprehensive knowledge base in minutes.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart AI Assistant</h3>
            <p className="text-gray-600">
              Powered by advanced AI that understands context and provides accurate, helpful responses based on your website's actual content.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Easy Integration</h3>
            <p className="text-gray-600">
              Simple copy-paste widget that works on any website. Customize colors, position, and greeting message to match your brand.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Private</h3>
            <p className="text-gray-600">
              Your data is encrypted and secure. We never share visitor information, and you maintain full control over your knowledge base.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Conversation Analytics</h3>
            <p className="text-gray-600">
              Track all conversations, understand common questions, and improve your content based on real visitor interactions.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-violet-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Multiple Websites</h3>
            <p className="text-gray-600">
              Manage multiple websites from a single dashboard. Each site gets its own customized AI assistant with unique knowledge.
            </p>
          </div>
        </div>

        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to enhance your website?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join businesses that are already providing better customer support with AI
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-3 bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-lg"
          >
            Get Started Now
          </button>
        </div>
      </div>

      <footer className="bg-gray-900 text-gray-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Globe className="w-6 h-6 text-blue-500" />
            <span className="ml-2 text-lg font-semibold text-white">SiteHelper</span>
          </div>
          <p>AI-Powered Website Assistant for Small and Medium Businesses</p>
        </div>
      </footer>
    </div>
  );
}
