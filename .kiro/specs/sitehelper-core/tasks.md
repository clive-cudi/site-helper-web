# Implementation Plan

- [ ] 1. Set up project foundation and dependencies
  - Initialize React + Vite project with TypeScript
  - Install and configure Tailwind CSS
  - Install Supabase client library and Lucide React icons
  - Configure TypeScript compiler options
  - Set up ESLint and code formatting
  - _Requirements: 1.1, 2.1_

- [ ] 2. Implement database schema and security policies
  - Create websites table with user_id foreign key and status tracking
  - Create knowledge_bases table with website_id foreign key
  - Create conversations table with website_id and visitor_id
  - Create messages table with conversation_id and role constraint
  - Add database indexes for performance optimization
  - _Requirements: 2.2, 2.3, 8.1, 8.2, 8.3, 8.5_

- [ ] 2.1 Configure Row-Level Security policies
  - Implement RLS policies for websites table (CRUD operations for owners)
  - Implement RLS policies for knowledge_bases table (read/update for owners)
  - Implement RLS policies for conversations table (read for owners, insert for anonymous)
  - Implement RLS policies for messages table (read for owners, insert/read for anonymous)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 3. Build authentication system
  - Create AuthContext with Supabase authentication integration
  - Implement sign up functionality with email/password
  - Implement sign in functionality with email/password
  - Implement sign out functionality with session cleanup
  - Add authentication state management and loading states
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 3.1 Create authentication UI components
  - Build AuthForm component with email and password inputs
  - Add form validation and error display
  - Implement toggle between sign up and sign in modes
  - Add loading states during authentication
  - _Requirements: 1.2, 1.3_

- [ ] 4. Implement landing page
  - Create LandingPage component with hero section
  - Build feature grid showcasing six key features
  - Add navigation bar with branding and CTA button
  - Implement call-to-action sections
  - Create footer with branding
  - Make responsive for mobile and desktop
  - _Requirements: 1.1_

- [ ] 5. Build dashboard layout and navigation
  - Create Dashboard component with navigation bar
  - Implement tab navigation for Websites, Conversations, and Settings
  - Add user email display in navigation
  - Implement sign out button with confirmation
  - Add responsive layout for mobile and desktop
  - _Requirements: 1.4, 1.5, 2.1_

- [ ] 6. Implement website management features
  - Create WebsiteList component to display user websites
  - Build add website form with name and URL inputs
  - Implement website creation with automatic knowledge base initialization
  - Add website status display (pending, processing, completed, failed)
  - Implement website deletion with confirmation dialog
  - Display scrape error messages for failed websites
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.6, 10.3, 10.4_

- [ ] 6.1 Add widget code generation
  - Generate embeddable widget code snippet for each website
  - Display widget code in a copyable text area
  - Include website ID and API URL in generated code
  - Show widget configuration preview
  - _Requirements: 4.1, 4.2_

- [ ] 7. Create website scraping edge function
  - Set up scrape-website Deno function with CORS headers
  - Implement URL fetching with proper user agent
  - Add HTML parsing to remove script and style tags
  - Strip HTML markup and normalize whitespace
  - Truncate content to 10,000 characters
  - Update knowledge_bases table with extracted content
  - Update website status to "completed" on success
  - Handle errors and update status to "failed" with error message
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.3_

- [ ] 8. Build chat assistant edge function
  - Set up chat-assistant Deno function with CORS headers
  - Implement conversation creation for first-time visitors
  - Store user messages in messages table
  - Fetch knowledge base content for the website
  - Construct OpenAI prompt with system instructions and knowledge base
  - Call OpenAI API with gpt-4o-mini model
  - Store assistant responses in messages table
  - Update conversation last_message_at timestamp
  - Handle missing OpenAI API key gracefully
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 10.2_

- [ ] 8.1 Implement error handling for chat function
  - Add try-catch blocks for OpenAI API calls
  - Return fallback messages on API failures
  - Log errors for debugging
  - Handle network timeouts
  - _Requirements: 10.1, 10.2_

- [ ] 9. Create embeddable chat widget component
  - Build SiteHelperWidget component with configurable props
  - Implement floating action button with icon
  - Create expandable chat window with header and close button
  - Add message list with user and assistant message styling
  - Implement message input with send button
  - Add keyboard support (Enter to send)
  - Apply custom primary color to buttons and user messages
  - Position widget based on configuration (bottom-right/bottom-left)
  - _Requirements: 4.3, 4.4, 4.5, 5.1_

- [ ] 9.1 Add widget state management
  - Generate or retrieve visitor ID from localStorage
  - Manage open/closed state
  - Track conversation ID across messages
  - Maintain message history in component state
  - Implement loading state during API calls
  - Auto-scroll to latest message
  - _Requirements: 5.1, 5.2, 10.5_

- [ ] 9.2 Integrate widget with chat API
  - Send messages to chat-assistant edge function
  - Handle conversation creation on first message
  - Display assistant responses in real-time
  - Show loading animation while waiting for response
  - Handle API errors with user-friendly messages
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 10.1, 10.5_

- [ ] 10. Implement conversation viewing
  - Create ConversationList component
  - Fetch conversations for user's websites
  - Display conversation list with visitor ID and timestamps
  - Implement conversation selection
  - Show message history for selected conversation
  - Distinguish between user and assistant messages visually
  - Format timestamps for readability
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10.1 Add conversation filtering
  - Implement filter by website dropdown
  - Update conversation list based on selected website
  - Show all conversations when no filter is applied
  - _Requirements: 9.2_

- [ ] 11. Implement widget customization
  - Create widget configuration form in dashboard
  - Add color picker for primary color
  - Add position selector (bottom-right/bottom-left)
  - Add greeting message text input
  - Save configuration to widget_config JSONB field
  - Update widget code snippet when configuration changes
  - _Requirements: 4.1, 4.2_

- [ ] 12. Add main application routing
  - Create App component with AuthProvider
  - Implement conditional rendering based on auth state
  - Show landing page for unauthenticated users
  - Show auth form when "Get Started" is clicked
  - Show dashboard for authenticated users
  - Add loading state during auth initialization
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 13. Implement multi-website isolation
  - Verify knowledge base queries filter by website_id
  - Ensure conversations are linked to correct website
  - Validate widget uses correct website's knowledge base
  - Test data isolation between different websites
  - _Requirements: 9.1, 9.3, 9.4, 9.5_

- [ ] 14. Add environment configuration
  - Create environment variable configuration for Supabase URL
  - Add environment variable for Supabase anon key
  - Configure OpenAI API key in Supabase secrets
  - Set up CORS configuration for edge functions
  - Document required environment variables
  - _Requirements: 1.3, 6.5, 8.4_

- [ ]* 15. Create comprehensive test suite
  - Write unit tests for authentication context
  - Write unit tests for widget component
  - Write integration tests for edge functions
  - Test RLS policies with different user scenarios
  - Test error handling paths
  - _Requirements: All_

- [ ]* 16. Perform end-to-end testing
  - Test complete user registration and website setup flow
  - Test website scraping with various URLs
  - Test chat widget interaction from visitor perspective
  - Test conversation viewing in dashboard
  - Test multi-website scenarios
  - Verify data isolation and security
  - _Requirements: All_

- [ ]* 17. Optimize performance
  - Add database query optimization and indexing verification
  - Implement lazy loading for conversation messages
  - Optimize widget bundle size
  - Add caching for knowledge base queries
  - Test with large knowledge bases
  - _Requirements: 3.4, 6.1_

- [ ]* 18. Add error monitoring and logging
  - Implement error tracking in edge functions
  - Add client-side error boundary
  - Log scraping failures with details
  - Monitor OpenAI API usage and errors
  - _Requirements: 10.1, 10.2, 10.3_
