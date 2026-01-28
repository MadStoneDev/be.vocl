"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { IconArrowLeft, IconDots } from "@tabler/icons-react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";

interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
  senderId: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface Participant {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface ActiveChatProps {
  conversationId: string;
  participant: Participant;
  messages: Message[];
  currentUserId: string;
  isTyping: boolean;
  onBack: () => void;
  onSendMessage: (content: string, mediaFile?: File) => Promise<void>;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onTyping: () => void;
}

export function ActiveChat({
  participant,
  messages,
  currentUserId,
  isTyping,
  onBack,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onTyping,
}: ActiveChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <IconArrowLeft size={20} />
        </button>

        {/* Participant info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              {participant.avatarUrl ? (
                <Image
                  src={participant.avatarUrl}
                  alt={participant.username}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {participant.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              @{participant.username}
            </p>
            <p className="text-xs text-foreground/40">
              {participant.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Menu */}
        <button className="p-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors">
          <IconDots size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-4">
              {participant.avatarUrl ? (
                <Image
                  src={participant.avatarUrl}
                  alt={participant.username}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-foreground/50 text-sm">
              Start your conversation with @{participant.username}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                id={message.id}
                content={message.content}
                mediaUrl={message.mediaUrl}
                mediaType={message.mediaType}
                senderId={message.senderId}
                isOwn={message.senderId === currentUserId}
                isRead={message.isRead}
                isEdited={message.isEdited}
                isDeleted={message.isDeleted}
                createdAt={message.createdAt}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
              />
            ))}
            {isTyping && <TypingIndicator username={participant.username} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSendMessage}
        onTyping={onTyping}
        placeholder={`Message @${participant.username}`}
      />
    </div>
  );
}

export type { Message, Participant };
