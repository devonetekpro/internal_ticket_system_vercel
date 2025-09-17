
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Assigns the currently logged-in agent to a specific chat session.
 * @param chatId The ID of the chat to assign.
 * @returns An object indicating success or failure.
 */
export async function assignAgentToChat(chatId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'You are not authenticated.' };
  }

  // Check if the chat is already assigned to someone else
  const { data: chatData } = await supabase
    .from('chats')
    .select('assigned_agent_id')
    .eq('id', chatId)
    .single();

  if (chatData?.assigned_agent_id && chatData.assigned_agent_id !== user.id) {
    // In a real-world scenario, you might want more complex logic here,
    // like allowing takeovers, but for now, we prevent it.
    return { success: false, message: 'This chat is already assigned to another agent.' };
  }

  const { error } = await supabase
    .from('chats')
    .update({ assigned_agent_id: user.id, status: 'active' })
    .eq('id', chatId);

  if (error) {
    console.error('Error assigning agent to chat:', error);
    return { success: false, message: `Database error: ${error.message}` };
  }
  
  // Create a system message to inform the client
  await supabase.from('chat_messages').insert({
      chat_id: chatId,
      sender_type: 'agent',
      content: 'An agent has joined the chat.',
  });

  revalidatePath(`/dashboard/live-chat/${chatId}`);
  revalidatePath('/dashboard/live-chat');
  return { success: true, message: 'You have been assigned to the chat.' };
}

/**
 * Sends a message from an agent to a specific chat session.
 * @param formData The form data containing the message content and chat ID.
 * @returns An object indicating success or failure.
 */
export async function sendAgentMessage(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'You are not authenticated.' };
  }

  const content = formData.get('content') as string;
  const chatId = formData.get('chatId') as string;

  if (!content || !chatId) {
    return { success: false, message: 'Invalid message or chat ID.' };
  }

  const { error } = await supabase.from('chat_messages').insert({
    chat_id: chatId,
    sender_type: 'agent',
    content: content,
  });

  if (error) {
    console.error('Error sending agent message:', error);
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath(`/dashboard/live-chat/${chatId}`);
  return { success: true };
}


/**
 * Closes a live chat session by setting its status to 'resolved'.
 * @param chatId The ID of the chat to close.
 * @returns An object indicating success or failure.
 */
export async function closeChat(chatId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'You are not authenticated.' };
  }

  // Optional: Add permission check to ensure only assigned agent or manager can close.
  // For now, we assume if you are on the page, you have rights.

  const { error } = await supabase
    .from('chats')
    .update({ status: 'resolved' })
    .eq('id', chatId);
  
  if (error) {
    console.error('Error closing chat:', error);
    return { success: false, message: `Database error: ${error.message}` };
  }
  
  await supabase.from('chat_messages').insert({
    chat_id: chatId,
    sender_type: 'agent',
    content: 'The agent has ended the chat.',
  });
  
  revalidatePath(`/dashboard/live-chat/${chatId}`);
  revalidatePath('/dashboard/live-chat');

  return { success: true, message: 'Chat has been closed.' };
}
