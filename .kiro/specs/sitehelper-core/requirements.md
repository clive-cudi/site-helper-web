# Requirements Document

## Introduction

SiteHelper is an AI-powered website assistant platform that enables businesses to provide 24/7 automated customer support through an embeddable chat widget. The system automatically extracts content from business websites to create a knowledge base, which powers an AI assistant that can answer visitor questions accurately based on the website's actual content.

## Glossary

- **SiteHelper System**: The complete web application including frontend dashboard, backend services, and chat widget
- **Business Owner**: An authenticated user who manages websites and views conversations
- **Website Visitor**: An anonymous user who interacts with the chat widget on a business website
- **Knowledge Base**: A structured collection of extracted content from a website used by the AI assistant
- **Chat Widget**: An embeddable UI component that provides chat functionality on business websites
- **Conversation**: A series of messages exchanged between a Website Visitor and the AI assistant
- **Scraping Process**: The automated extraction of text content from a website URL
- **Widget Configuration**: Customizable settings for the Chat Widget including colors, position, and greeting

## Requirements

### Requirement 1: User Authentication and Account Management

**User Story:** As a Business Owner, I want to create an account and authenticate securely, so that I can manage my websites and access conversation data.

#### Acceptance Criteria

1. WHEN a Business Owner visits the landing page, THE SiteHelper System SHALL display a "Get Started" button
2. WHEN a Business Owner clicks "Get Started", THE SiteHelper System SHALL display an authentication form
3. WHEN a Business Owner submits valid credentials, THE SiteHelper System SHALL authenticate the user and redirect to the dashboard
4. WHEN a Business Owner is authenticated, THE SiteHelper System SHALL display their email address in the navigation bar
5. WHEN a Business Owner clicks "Sign Out", THE SiteHelper System SHALL terminate the session and redirect to the landing page

### Requirement 2: Website Registration and Management

**User Story:** As a Business Owner, I want to add and manage multiple websites, so that I can provide AI assistants for all my business properties.

#### Acceptance Criteria

1. WHEN a Business Owner accesses the dashboard, THE SiteHelper System SHALL display a list of their registered websites
2. WHEN a Business Owner adds a new website with a name and URL, THE SiteHelper System SHALL create a website record with status "pending"
3. WHEN a website is created, THE SiteHelper System SHALL automatically create an associated Knowledge Base record
4. WHEN a Business Owner views their websites, THE SiteHelper System SHALL display the name, URL, and current status for each website
5. WHEN a Business Owner deletes a website, THE SiteHelper System SHALL remove the website and all associated data including Knowledge Base, conversations, and messages

### Requirement 3: Automated Content Extraction

**User Story:** As a Business Owner, I want the system to automatically extract content from my website, so that the AI assistant has accurate information to answer questions.

#### Acceptance Criteria

1. WHEN a website is registered, THE SiteHelper System SHALL initiate the Scraping Process
2. WHEN the Scraping Process starts, THE SiteHelper System SHALL update the website status to "processing"
3. WHEN the Scraping Process fetches the URL, THE SiteHelper System SHALL remove script tags, style tags, and HTML markup from the content
4. WHEN content extraction succeeds, THE SiteHelper System SHALL store up to 10,000 characters in the Knowledge Base
5. WHEN content extraction succeeds, THE SiteHelper System SHALL update the website status to "completed"
6. IF the Scraping Process fails, THEN THE SiteHelper System SHALL update the website status to "failed" and store the error message

### Requirement 4: Chat Widget Generation and Customization

**User Story:** As a Business Owner, I want to customize and embed a chat widget on my website, so that visitors can interact with the AI assistant in a way that matches my brand.

#### Acceptance Criteria

1. WHEN a website is created, THE SiteHelper System SHALL generate default Widget Configuration with theme, primary color, position, and greeting
2. WHEN a Business Owner modifies Widget Configuration, THE SiteHelper System SHALL store the updated settings in the website record
3. WHEN the Chat Widget is embedded on a website, THE SiteHelper System SHALL apply the configured primary color to the chat button and message bubbles
4. WHEN the Chat Widget is embedded on a website, THE SiteHelper System SHALL position the widget according to the configured position setting
5. WHEN a Website Visitor opens the Chat Widget, THE SiteHelper System SHALL display the configured greeting message

### Requirement 5: Visitor Chat Interaction

**User Story:** As a Website Visitor, I want to ask questions through the chat widget and receive instant answers, so that I can get information about the business without waiting for human support.

#### Acceptance Criteria

1. WHEN a Website Visitor opens the Chat Widget, THE SiteHelper System SHALL generate or retrieve a unique visitor identifier from browser storage
2. WHEN a Website Visitor sends their first message, THE SiteHelper System SHALL create a new Conversation record
3. WHEN a Website Visitor sends a message, THE SiteHelper System SHALL store the message with role "user"
4. WHEN a user message is received, THE SiteHelper System SHALL retrieve the Knowledge Base content for the associated website
5. WHEN a user message is received, THE SiteHelper System SHALL send the message and Knowledge Base content to the OpenAI API
6. WHEN the OpenAI API responds, THE SiteHelper System SHALL store the response as a message with role "assistant"
7. WHEN a message is added to a Conversation, THE SiteHelper System SHALL update the last_message_at timestamp

### Requirement 6: AI-Powered Response Generation

**User Story:** As a Website Visitor, I want to receive accurate answers based on the actual website content, so that I can trust the information provided by the assistant.

#### Acceptance Criteria

1. WHEN generating a response, THE SiteHelper System SHALL include up to 8,000 characters of Knowledge Base content in the AI prompt
2. WHEN generating a response, THE SiteHelper System SHALL instruct the AI to answer based only on the Knowledge Base content
3. WHEN generating a response, THE SiteHelper System SHALL set the AI temperature to 0.7 for balanced creativity
4. WHEN generating a response, THE SiteHelper System SHALL limit responses to 500 tokens maximum
5. IF the OpenAI API key is not configured, THEN THE SiteHelper System SHALL return a message indicating the assistant is not yet configured

### Requirement 7: Conversation History and Analytics

**User Story:** As a Business Owner, I want to view all conversations from my website visitors, so that I can understand common questions and improve my content.

#### Acceptance Criteria

1. WHEN a Business Owner accesses the Conversations tab, THE SiteHelper System SHALL display all conversations for their websites
2. WHEN displaying conversations, THE SiteHelper System SHALL show the visitor ID, start time, and last message time
3. WHEN a Business Owner selects a conversation, THE SiteHelper System SHALL display all messages in chronological order
4. WHEN displaying messages, THE SiteHelper System SHALL distinguish between user messages and assistant messages
5. WHEN a Business Owner views conversations, THE SiteHelper System SHALL only show conversations for websites they own

### Requirement 8: Data Security and Privacy

**User Story:** As a Business Owner, I want my data and visitor conversations to be secure and private, so that I can trust the platform with sensitive business information.

#### Acceptance Criteria

1. WHEN accessing website data, THE SiteHelper System SHALL enforce row-level security policies based on user ownership
2. WHEN accessing Knowledge Base data, THE SiteHelper System SHALL verify the requesting user owns the associated website
3. WHEN accessing conversation data, THE SiteHelper System SHALL verify the requesting user owns the associated website
4. WHEN a Website Visitor creates a conversation, THE SiteHelper System SHALL allow anonymous access without authentication
5. WHEN a user account is deleted, THE SiteHelper System SHALL cascade delete all associated websites, Knowledge Bases, conversations, and messages

### Requirement 9: Multi-Website Support

**User Story:** As a Business Owner with multiple websites, I want to manage all my AI assistants from a single dashboard, so that I can efficiently oversee all my customer support channels.

#### Acceptance Criteria

1. WHEN a Business Owner has multiple websites, THE SiteHelper System SHALL display all websites in the dashboard
2. WHEN viewing conversations, THE SiteHelper System SHALL allow filtering by website
3. WHEN a Chat Widget is embedded, THE SiteHelper System SHALL use the correct Knowledge Base for the associated website
4. WHEN generating responses, THE SiteHelper System SHALL ensure the AI only uses content from the specific website's Knowledge Base
5. WHEN a Business Owner adds a website, THE SiteHelper System SHALL create an isolated Knowledge Base that does not share data with other websites

### Requirement 10: Error Handling and User Feedback

**User Story:** As a Website Visitor, I want to receive clear feedback when errors occur, so that I understand what happened and can take appropriate action.

#### Acceptance Criteria

1. WHEN the Chat Widget cannot connect to the backend, THE SiteHelper System SHALL display an error message to the Website Visitor
2. WHEN the AI fails to generate a response, THE SiteHelper System SHALL display a fallback message asking the visitor to try again
3. WHEN the Scraping Process fails, THE SiteHelper System SHALL store the error message and display it to the Business Owner
4. WHEN a Business Owner views a failed website, THE SiteHelper System SHALL display the scrape error message
5. WHEN the Chat Widget is loading a response, THE SiteHelper System SHALL display an animated loading indicator
