import { useCallback, useMemo } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import { getDeployment } from "@/lib/environment/deployments";
import { v4 as uuidv4 } from "uuid";
import type { TodoItem } from "../types/types";
import { createClient } from "@/lib/client";
import { useAuthContext } from "@/providers/Auth";

type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
};

export function useChat(
  threadId: string | null,
  setThreadId: (
    value: string | ((old: string | null) => string | null) | null,
  ) => void,
  onTodosUpdate: (todos: TodoItem[]) => void,
  onFilesUpdate: (files: Record<string, string>) => void,
  currentFiles?: Record<string, string>,
  userId?: string,
) {
  const deployment = useMemo(() => getDeployment(), []);
  const { session } = useAuthContext();
  const accessToken = session?.accessToken;

  const agentId = useMemo(() => {
    if (!deployment?.agentId) {
      throw new Error(`No agent ID configured in environment`);
    }
    return deployment.agentId;
  }, [deployment]);

  const handleUpdateEvent = useCallback(
    (data: { [node: string]: Partial<StateType> }) => {
      Object.entries(data).forEach(([_, nodeData]) => {
        if (nodeData?.todos) {
          onTodosUpdate(nodeData.todos);
        }
        if (nodeData?.files) {
          onFilesUpdate(nodeData.files);
        }
      });
    },
    [onTodosUpdate, onFilesUpdate],
  );

  const stream = useStream<StateType>({
    assistantId: agentId,
    client: createClient(accessToken || ""),
    reconnectOnMount: true,
    threadId: threadId ?? null,
    onUpdateEvent: handleUpdateEvent,
    onThreadId: setThreadId,
    defaultHeaders: {
      "x-auth-scheme": "langsmith",
      ...(userId && { "x-user-id": userId }),
    },
  });

  const sendMessage = useCallback(
    async (message: string) => {
      const humanMessage: Message = {
        id: uuidv4(),
        type: "human",
        content: message,
      };
      
      // Include current files in the submission to ensure agent has latest state
      const submitData: any = { messages: [humanMessage] };
      if (currentFiles && Object.keys(currentFiles).length > 0) {
        submitData.files = currentFiles;
        console.log("Including files with message:", Object.keys(currentFiles));
      }
      
      // Get the latest thread state to ensure we use the most recent checkpoint
      if (threadId && accessToken) {
        try {
          const client = createClient(accessToken);
          const currentState = await client.threads.getState(threadId);
          console.log("Latest checkpoint before message:", currentState.checkpoint?.checkpoint_id);
          
          // Submit with both files and latest checkpoint
          stream.submit(
            submitData,
            {
              optimisticValues(prev) {
                const prevMessages = prev.messages ?? [];
                const newMessages = [...prevMessages, humanMessage];
                const result = { ...prev, messages: newMessages };
                if (currentFiles) {
                  result.files = currentFiles;
                }
                return result;
              },
              config: {
                recursion_limit: 100,
                configurable: {
                  checkpoint_id: currentState.checkpoint?.checkpoint_id,
                  checkpoint_ns: currentState.checkpoint?.checkpoint_ns || "",
                  user_id: userId,
                },
              },
            },
          );
        } catch (error) {
          console.warn("Could not get latest checkpoint:", error);
          // Fallback to normal submit without checkpoint but include files
          stream.submit(
            submitData,
            {
              optimisticValues(prev) {
                const prevMessages = prev.messages ?? [];
                const newMessages = [...prevMessages, humanMessage];
                const result = { ...prev, messages: newMessages };
                if (currentFiles) {
                  result.files = currentFiles;
                }
                return result;
              },
              config: {
                recursion_limit: 100,
                configurable: {
                  user_id: userId,
                },
              },
            },
          );
        }
      } else {
        // No thread ID or access token, submit normally but include files
        stream.submit(
          submitData,
          {
            optimisticValues(prev) {
              const prevMessages = prev.messages ?? [];
              const newMessages = [...prevMessages, humanMessage];
              const result = { ...prev, messages: newMessages };
              if (currentFiles) {
                result.files = currentFiles;
              }
              return result;
            },
            config: {
              recursion_limit: 100,
              configurable: {
                user_id: userId,
              },
            },
          },
        );
      }
    },
    [stream, threadId, accessToken, currentFiles],
  );

  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  return {
    messages: stream.messages,
    isLoading: stream.isLoading,
    sendMessage,
    stopStream,
  };
}
