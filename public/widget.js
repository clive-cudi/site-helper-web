(function() {
  const websiteId = document.currentScript.getAttribute('data-website-id');
  const apiUrl = document.currentScript.getAttribute('data-api-url');

  if (!websiteId || !apiUrl) {
    console.error('SiteHelper: Missing configuration');
    return;
  }

  let conversationId = null;
  let visitorId = localStorage.getItem('sitehelper_visitor_id');

  if (!visitorId) {
    visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    localStorage.setItem('sitehelper_visitor_id', visitorId);
  }

  const styles = `
    .sitehelper-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .sitehelper-button {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background: #3b82f6;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .sitehelper-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .sitehelper-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .sitehelper-chat {
      display: none;
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 550px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      flex-direction: column;
      overflow: hidden;
    }
    .sitehelper-chat.open {
      display: flex;
    }
    .sitehelper-header {
      background: #3b82f6;
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sitehelper-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .sitehelper-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sitehelper-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f9fafb;
    }
    .sitehelper-message {
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
    }
    .sitehelper-message.user {
      flex-direction: row-reverse;
    }
    .sitehelper-message-content {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
    }
    .sitehelper-message.user .sitehelper-message-content {
      background: #3b82f6;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .sitehelper-message.assistant .sitehelper-message-content {
      background: white;
      color: #1f2937;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .sitehelper-input-area {
      border-top: 1px solid #e5e7eb;
      padding: 16px;
      background: white;
    }
    .sitehelper-input-container {
      display: flex;
      gap: 8px;
    }
    .sitehelper-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }
    .sitehelper-input:focus {
      border-color: #3b82f6;
    }
    .sitehelper-send {
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
      transition: background 0.2s;
    }
    .sitehelper-send:hover:not(:disabled) {
      background: #2563eb;
    }
    .sitehelper-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .sitehelper-typing {
      padding: 10px 14px;
      background: white;
      border-radius: 12px;
      border-bottom-left-radius: 4px;
      max-width: 70%;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .sitehelper-typing span {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      margin: 0 2px;
      animation: typing 1.4s infinite;
    }
    .sitehelper-typing span:nth-child(2) {
      animation-delay: 0.2s;
    }
    .sitehelper-typing span:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-10px); }
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  const widgetHTML = `
    <div class="sitehelper-widget">
      <button class="sitehelper-button" id="sitehelper-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>
      <div class="sitehelper-chat" id="sitehelper-chat">
        <div class="sitehelper-header">
          <h3>Chat with us</h3>
          <button class="sitehelper-close" id="sitehelper-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="sitehelper-messages" id="sitehelper-messages">
          <div class="sitehelper-message assistant">
            <div class="sitehelper-message-content">
              Hi! How can I help you today?
            </div>
          </div>
        </div>
        <div class="sitehelper-input-area">
          <div class="sitehelper-input-container">
            <input
              type="text"
              class="sitehelper-input"
              id="sitehelper-input"
              placeholder="Type your message..."
              autocomplete="off"
            />
            <button class="sitehelper-send" id="sitehelper-send">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = widgetHTML;
  document.body.appendChild(container);

  const toggleButton = document.getElementById('sitehelper-toggle');
  const closeButton = document.getElementById('sitehelper-close');
  const chatWindow = document.getElementById('sitehelper-chat');
  const messagesContainer = document.getElementById('sitehelper-messages');
  const input = document.getElementById('sitehelper-input');
  const sendButton = document.getElementById('sitehelper-send');

  toggleButton.addEventListener('click', () => {
    chatWindow.classList.add('open');
  });

  closeButton.addEventListener('click', () => {
    chatWindow.classList.remove('open');
  });

  function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `sitehelper-message ${role}`;
    messageDiv.innerHTML = `<div class="sitehelper-message-content">${content}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'sitehelper-message assistant';
    typingDiv.id = 'sitehelper-typing-indicator';
    typingDiv.innerHTML = '<div class="sitehelper-typing"><span></span><span></span><span></span></div>';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    const typingIndicator = document.getElementById('sitehelper-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';
    sendButton.disabled = true;
    showTyping();

    try {
      const response = await fetch(`${apiUrl}/functions/v1/chat-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          conversationId,
          message,
          visitorId
        })
      });

      const data = await response.json();
      hideTyping();

      if (data.error) {
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
      } else {
        conversationId = data.conversationId;
        addMessage(data.message, 'assistant');
      }
    } catch (error) {
      hideTyping();
      addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
      console.error('SiteHelper error:', error);
    } finally {
      sendButton.disabled = false;
      input.focus();
    }
  }

  sendButton.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
})();
