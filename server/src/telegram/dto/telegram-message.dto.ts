export interface SendMessageDto {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

export interface TelegramConfig {
  botToken: string;
  defaultChatId: string;
}
