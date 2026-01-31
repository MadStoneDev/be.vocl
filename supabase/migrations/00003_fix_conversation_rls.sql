-- Fix infinite recursion in conversation_participants RLS policy
-- The original policy queries conversation_participants to check if user is a participant,
-- which causes infinite recursion when Supabase tries to evaluate the same policy.

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Conversation participants can view messages" ON messages;
DROP POLICY IF EXISTS "Conversation participants can send messages" ON messages;
DROP POLICY IF EXISTS "Typing indicators visible to conversation participants" ON typing_indicators;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- Create a security definer function to check conversation membership
-- This bypasses RLS when checking membership, preventing infinite recursion
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND profile_id = auth.uid()
  );
$$;

-- Recreate policies using the helper function

-- Conversations: users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT USING (
    is_conversation_member(id)
  );

-- Conversation participants: users can view all participants in their conversations
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT USING (
    is_conversation_member(conversation_id)
  );

-- Messages: conversation participants can view and send messages
CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT USING (
    is_conversation_member(conversation_id)
  );

CREATE POLICY "Conversation participants can send messages"
  ON messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND is_conversation_member(conversation_id)
  );

-- Typing indicators: visible to conversation participants
CREATE POLICY "Typing indicators visible to conversation participants"
  ON typing_indicators FOR ALL USING (
    is_conversation_member(conversation_id)
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_conversation_member(UUID) TO authenticated;
