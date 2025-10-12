import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { websiteId, conversationId, message, visitorId } = await req.json();

    if (!websiteId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          website_id: websiteId,
          visitor_id: visitorId || `visitor_${Date.now()}`,
          started_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;
      currentConversationId = newConversation.id;
    }

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message,
    });

    const { data: kb } = await supabase
      .from('knowledge_bases')
      .select('content, summary')
      .eq('website_id', websiteId)
      .single();

    const knowledgeBaseContent = kb?.content || 'No knowledge base available.';
    const kbSummary = kb?.summary || '';

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    let assistantMessage = '';

    if (!openaiApiKey) {
      assistantMessage = "I'm here to help! However, the OpenAI API key hasn't been configured yet. Please contact the website administrator to set up the AI assistant.";
    } else {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a helpful customer service assistant for a website. Use the following knowledge base to answer questions accurately and helpfully.\n\nKnowledge Base Summary: ${kbSummary}\n\nKnowledge Base Content:\n${knowledgeBaseContent.substring(0, 8000)}\n\nIf you don't know the answer based on the knowledge base, politely say so and offer to help in other ways.`,
              },
              {
                role: 'user',
                content: message,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        }

        const openaiData = await openaiResponse.json();
        assistantMessage = openaiData.choices[0]?.message?.content || 'I apologize, but I encountered an error processing your request.';
      } catch (openaiError: any) {
        console.error('OpenAI error:', openaiError);
        assistantMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
      }
    }

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: assistantMessage,
    });

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', currentConversationId);

    return new Response(
      JSON.stringify({
        conversationId: currentConversationId,
        message: assistantMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Chat assistant error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});