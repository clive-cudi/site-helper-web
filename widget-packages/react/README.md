# SiteHelper React Widget

Pre-packaged chat widget component for React applications.

## Installation

1. Extract this zip file into your React project
2. Copy the `widget` folder to your `src/components` directory
3. Install required dependencies:

```bash
npm install lucide-react
# or
yarn add lucide-react
# or
pnpm add lucide-react
```

## Usage

Import and use the `SiteHelperWidget` component in your React application:

```tsx
import { SiteHelperWidget } from './components/widget';

function App() {
  return (
    <div>
      {/* Your app content */}

      <SiteHelperWidget
        websiteId="your-website-id"
        apiUrl="https://your-supabase-url.supabase.co"
        primaryColor="#3b82f6"
        position="bottom-right"
        greeting="Hi! How can I help you today?"
      />
    </div>
  );
}

export default App;
```

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

## Requirements

- React 18 or higher
- lucide-react for icons
- Modern browser with localStorage support

## Styling

The widget uses inline styles and Tailwind CSS classes. If you're not using Tailwind CSS in your project, the widget will still work with its inline styles, but some utility classes may not apply. For best results, ensure Tailwind CSS is configured in your project.

## Troubleshooting

### Widget not appearing
- Ensure you've provided valid `websiteId` and `apiUrl` props
- Check browser console for any errors
- Verify that lucide-react is installed

### Styling issues
- If using Tailwind CSS, ensure it's properly configured
- Check that no global styles are conflicting with the widget
- The widget uses high z-index (999999) to stay on top

### API connection issues
- Verify your `apiUrl` is correct and includes the full Supabase URL
- Check that your website is registered in the SiteHelper dashboard
- Ensure CORS is properly configured in your Supabase project

## Support

For issues or questions, please contact support or visit the SiteHelper documentation.
