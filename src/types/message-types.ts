export type MessageCommand = "GET_TAB_ID" | "SAVE_JIRA_URL" | "SAVE_AGO_URL";

interface IMessage {
  command: MessageCommand;
  url?: string;
}

export interface AGOUrlSaveRequest extends IMessage {
  command: "SAVE_AGO_URL",
  url: string,
  agoClientName: string,
}
export interface JIRASaveRequest extends IMessage {
  command: "SAVE_JIRA_URL",
  url: string,
  jiraSprint: string,
}
export interface GetTabIdRequest extends IMessage {
  command: "GET_TAB_ID",
}

export type Message = AGOUrlSaveRequest | JIRASaveRequest | GetTabIdRequest;


export interface ISuccessMsgResponse {
  ok: true;
}

export interface IErrorMsgResponse {
  ok: false;
  error: string;
}

interface GetTabIdResponse extends ISuccessMsgResponse {
  tabId: number;
}

interface JiraUrlSaveResponse extends ISuccessMsgResponse {
  message: string;
}

interface AgoUrlSaveResponse extends ISuccessMsgResponse {
  message: string;
}

export type MessageResponse<T extends MessageCommand> =
  (
    T extends "GET_TAB_ID" ? GetTabIdResponse
    : T extends "SAVE_JIRA_URL" ? JiraUrlSaveResponse
    : T extends "SAVE_AGO_URL" ? AgoUrlSaveResponse
    : never
  ) | IErrorMsgResponse;


export type OnMessageListener = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse<MessageCommand>) => void
) => boolean | void;