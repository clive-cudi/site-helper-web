# SiteHelper Next.js Widget

Pre-packaged chat widget component for Next.js applications with App Router support.

## Installation

1. Extract this zip file into your Next.js project
2. Copy the `widget` folder to your `src/components` directory (or `components` if not using src)
3. Install required dependencies:

```bash
npm install lucide-react
# or
yarn add lucide-react
# or
pnpm add lucide-react
```

## Usage

### With App Router (Next.js 13+)

Import and use the `NextJsWidget` component in your root layout:

```tsx
// app/layout.tsx
import { NextJsWidget } from '@/components/widget';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}

        <NextJsWidget
          websiteId="your-website-id"
          apiUrl="https://your-supabase-url.supabase.co"
          primaryColor="#3b82f6"
          position="bottom-right"
          greeting="Hi! How can I help you today?"
        />
      </body>
    </html>
  );
}
```

### With Pages Router (Next.js 12 and below)

Import and use in your `_app.tsx`:

```tsx
// pages/_app.tsx
import { SiteHelperWidget } from '@/components/widget';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      
      <SiteHelperWidget
        websiteId="your-website-id"
        apiUrl="https://your-supabase-url.supabase.co"
        primaryColor="#3b82f6"
        position="bottom-right"
        greeting="Hi! How can I help you today?"
      />
    </>
  );
}
```

## Important: 'use client' Directive

The `NextJsWidget` component includes the `'use client'` directive at the top of the file. This is required for Next.js App Router because the widget uses React hooks and browser APIs (like localStorage) that only work on the client side.

**What this means:**
- The widget will only render on the client (browser), not during server-side rendering
- This is the correct and recommended approach for interactive components in Next.js 13+
- No additional configuration needed - it works out of the box

## Configuration Options

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `websiteId` | string | - | Yes | Your website ID from SiteHelper dashboard |
| `apiUrl` | string | - | Yes | Your Supabase project URL |
| `theme` | 'light' \| 'dark' | 'light' | No | Widget theme (currently light only) |
| `primaryColor` | string | '#3b82f6' | No | Primary color for the widget UI |
| `position` | 'bottom-right' \| 'bottom-left' | 'bottom-right' | No | Widget position on screen |
| `greeting` | string | 'Hi! How can I help you today?' | No | Initial greeting message |

## Features

- 💬 Beautiful, customizable chat interface
- 🎨 Customizable colors and positioning
- 📱 Fully responsive design
- ♿ Accessible (keyboard navigation, ARIA labels)
- 💾 Automatic visitor ID management
- 🔄 Conversation persistence across sessions
- ⌨️ Keyboard shortcuts (Enter to send)
- 🎯 TypeScript support included
- ⚡ Optimized for Next.js App Router

## Requirements

- Next.js 12 or higher (App Router support for Next.js 13+)
- React 18 or higher
- lucide-react for icons
- Modern browser with localStorage support

## Styling

The widget uses inline styles and Tailwind CSS classes. If you're using Tailwind CSS in your Next.js project (recommended), ensure it's properly configured. The widget will work without Tailwind but may have limited styling.

### Tailwind CSS Configuration

If you're using Tailwind CSS, make sure your `tailwind.config.js` includes the widget path:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // Add this line:
    './components/widget/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest of config
};
```

## Troubleshooting

### Widget not appearing
- Ensure you've provided valid `websiteId` and `apiUrl` props
- Check browser console for any errors
- Verify that lucide-react is installed
- Make sure the component is placed inside the `<body>` tag in your layout

### "use client" errors
- The `NextJsWidget` component already includes the `'use client'` directive
- Don't remove this directive - it's required for the widget to work
- If you see hydration errors, ensure you're using the widget in a client component context

### Styling issues
- If using Tailwind CSS, ensure it's properly configured (see above)
- Check that no global styles are conflicting with the widget
- The widget uses high z-index (999999) to stay on top

### API connection issues
- Verify your `apiUrl` is correct and includes the full Supabase URL
- Check that your website is registered in the SiteHelper dashboard
- Ensure CORS is properly configured in your Supabase project

### Server-side rendering issues
- The widget is client-only and won't render during SSR (this is intentional)
- Don't try to access the widget during server-side rendering
- Use the `NextJsWidget` wrapper which handles this automatically

## Support

For issues or questions, please contact support or visit the SiteHelper documentation.
