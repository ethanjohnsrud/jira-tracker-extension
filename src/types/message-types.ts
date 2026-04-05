export type MessageCommand = "GET_TAB_ID" | "SAVE_JIRA_URL" | "SAVE_AGO_URL";

interface IMessage {
  command: MessageCommand;
  url?: string;
}

export interface AGOUrlSaveRequest extends IMessage {
  command: "SAVE_AGO_URL",
  url: string,
  region: string;
  environment: string;
  route: string;
  clientID: string;
  planID: string;
  agoPlanName: string,
  clientFullName: string,
  clientLastName: string,
  /**@deprecated use `clientFullName` or `clientLastName` instead */
  agoClientName: string,
}
export interface JIRASaveRequest extends IMessage {
  command: "SAVE_JIRA_URL",
  url: string,
  jiraTitle: string,
  jiraSprint: string,
  jiraStatus: string,
}
export interface GetTabIdRequest extends IMessage {
  command: "GET_TAB_ID",
}

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

export type Message<T extends MessageCommand = MessageCommand>
  = T extends "GET_TAB_ID" ? GetTabIdRequest
  : T extends "SAVE_JIRA_URL" ? JIRASaveRequest
  : T extends "SAVE_AGO_URL" ? AGOUrlSaveRequest
  : never;

export type MessageResponse<T extends MessageCommand>
  = (
    T extends "GET_TAB_ID" ? GetTabIdResponse
    : T extends "SAVE_JIRA_URL" ? JiraUrlSaveResponse
    : T extends "SAVE_AGO_URL" ? AgoUrlSaveResponse
    : never
  ) | IErrorMsgResponse;


export type OnMessageListener = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: <T extends MessageCommand>(response: MessageResponse<T>) => void
) => boolean | void;

export type MessageHandlers = {
  [K in MessageCommand]: (
    request: Message<K>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse<K>) => void
  ) => Promise<boolean | void> | boolean | void;
};