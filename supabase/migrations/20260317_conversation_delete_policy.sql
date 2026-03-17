-- Add missing DELETE policy for conversation_participants
-- Without this, hideConversation() silently fails because RLS blocks the delete.
CREATE POLICY "Users can leave conversations"
  ON conversation_participants FOR DELETE USING (profile_id = auth.uid());
