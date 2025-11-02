# SiteHelper Chat Widget

Embeddable chat widget components for React and Next.js applications.

## Installation

### For React

1. Copy the `widget` folder to your React project's components directory
2. Import and use the `SiteHelperWidget` component:

```tsx
import { SiteHelperWidget } from './components/widget';

function App() {
  return (
    <div>
      {/* Your app content */}

      <SiteHelperWidget
        websiteId="your-website-id"
        apiUrl="https://your-supabase-url.supabase.co"
        theme="light"
        primaryColor="#3b82f6"
        position="bottom-right"
        greeting="Hi! How can I help you today?"
      />
    </div>
  );
}
```

### For Next.js

1. Copy the `widget` folder to your Next.js project's components directory
2. Import and use the `NextJsWidget` component in your layout:

```tsx
import { NextJsWidget } from './components/widget';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}

        <NextJsWidget
          websiteId="your-website-id"
          apiUrl="https://your-supabase-url.supabase.co"
          theme="light"
          primaryColor="#3b82f6"
          position="bottom-right"
          greeting="Hi! How can I help you today?"
        />
      </body>
    </html>
  );
}
```

### For Vanilla JavaScript / HTML

Add this script tag before the closing `</body>` tag:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/widget.js';
    script.setAttribute('data-website-id', 'your-website-id');
    script.setAttribute('data-api-url', 'https://your-supabase-url.supabase.co');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `websiteId` | string | required | Your website ID from SiteHelper dashboard |
| `apiUrl` | string | required | Your Supabase project URL |
| `theme` | 'light' \| 'dark' | 'light' | Widget theme |
| `primaryColor` | string | '#3b82f6' | Primary color for the widget |
| `position` | 'bottom-right' \| 'bottom-left' | 'bottom-right' | Widget position on screen |
| `greeting` | string | 'Hi! How can I help you today?' | Initial greeting message |

## Features

- Beautiful, customizable chat interface
- Automatic visitor ID management
- Conversation persistence
- Typing indicators
- Responsive design
- Accessible (keyboard navigation, ARIA labels)
- Works with Tailwind CSS or standalone

## Dependencies

The React/Next.js components require:
- React 18+
- lucide-react (for icons)

The vanilla JS version has no dependencies.
