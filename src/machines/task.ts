import { ActorRef, assign, createMachine } from "xstate";
import { sendParent } from "xstate/lib/actions";
import { Task, TaskState } from "./types";

export type Context = Task & {
  result?: any;
  error?: Error;
  assetUploader: ActorRef<any>;
};

export type States =
  | { value: "idle"; context: Context }
  | {
      value: { submitting: "assets" } | { submitting: "data" };
      context: Context;
    }
  | { value: "submitted"; context: Context }
  | { value: "error"; context: Context };

export type Events =
  | { type: "RETRY" }

  // asset uploader event
  | { type: "DONE" };

const machine = createMachine<Context, Events, States>(
  {
    id: "task",
    initial: "idle",

    states: {
      idle: {
        always: [
          {
            cond: "isDone",
            target: "submitted"
          },
          {
            target: "submitting"
          }
        ]
      },
      submitting: {
        entry: "setStateUploading",

        invoke: {
          src: "submit",
          onDone: {
            target: "submitted"
            // actions: "setResult"
          },
          onError: {
            target: "error",
            actions: "setError"
          }
        }
      },
      submitted: {
        // type: 'final',
        entry: ["saveTask", "setStateDone", "notifyParent"]
      },
      error: {
        entry: "notifyError",

        on: {
          RETRY: "submitting"
        },

        after: {
          1000: "submitting"
        }
      }
    }
  },
  {
    guards: {
      isDone: ({ state }) => state === TaskState.DONE
    },
    actions: {
      setError: assign({ error: (_, { data }: any) => data }),

      setResult: assign({ result: (_, { data }: any) => data.data }),

      setStateDone: assign({ state: (_) => TaskState.DONE }),

      setStateUploading: assign({ state: (_) => TaskState.UPLOADING }),

      notifyParent: sendParent((ctx) => ({ type: "TASK_DONE", task: ctx })),

      notifyError: (_, { data }: any) => {
        console.log("tasks error: ", _?.id, data?.response);
      }
    },

    services: {
      submit() {
        return new Promise((res) => {
          setTimeout(res, 2000);
        });
      }
    }
  }
);

export default machine;
