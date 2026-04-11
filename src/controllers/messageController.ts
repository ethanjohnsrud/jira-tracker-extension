import { Message, MessageCommand, MessageResponse } from "../types/message-types";

/** Send a message from the content script to the background script using `chrome.runtime.sendMessage` */
export const sendMessage = async <T extends MessageCommand>(message: Message): Promise<MessageResponse<T>> => {
  return chrome.runtime.sendMessage(message);
};
