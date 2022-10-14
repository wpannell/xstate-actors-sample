import {
  actions,
  ActorRef,
  assign,
  createMachine,
  Interpreter,
  send,
  spawn,
  State as StateType
} from "xstate";
import taskMachine, {
  Context as TaskContext,
  Events as TaskEvents,
  States as TaskStates
} from "./task";
import { Task, Tasks, TaskState } from "./types";
import { mapToArray } from "./utils";

export type SpawnedActorRef = ActorRef<
  TaskEvents,
  StateType<TaskContext, TaskEvents, TaskStates>
>;

export type Context = {
  tasks: Tasks;
  spawnedTasks: Map<string, SpawnedActorRef>;
};

type States =
  | { value: "inactive"; context: Context }
  | { value: "idle"; context: Context }
  | { value: "local"; context: Context }
  | { value: "spawning"; context: Context };

type Events =
  | { type: "START" }
  | { type: "ADD_TASK"; task: Task }
  | { type: "TASK_DONE"; task: Task }
  | { type: "REMOVE_TASK"; task: Task["id"] };

const { pure, stop } = actions;

const dummyTasks: Record<number, Task> = {
  1: {
    id: "1",
    mocked: false,
    assets: new Map(),
    collectedOn: new Date(),
    state: TaskState.PENDING,
    data: { 1: "jgkf", 2: "kjgfg" },
    geometry: { latitude: 0, longitude: 0 }
  },
  2: {
    id: "2",
    mocked: false,
    assets: new Map(),
    collectedOn: new Date(),
    state: TaskState.PENDING,
    data: { 1: "jgkf", 2: "kjgfg" },
    geometry: { latitude: 0, longitude: 0 }
  }
};

const machine = createMachine<Context, Events, States>(
  {
    id: "task-manager",
    initial: "local",
    context: {
      tasks: new Map(),
      spawnedTasks: new Map()
    },
    states: {
      idle: {
        on: {
          ADD_TASK: {
            target: "spawning",
            actions: "setTask"
          },

          // event that triggers the error
          REMOVE_TASK: {
            actions: [
              stop(({ spawnedTasks }, { task }) => {
                return spawnedTasks.get(task) as any;
              }),
              "removeTask"
            ]
          },

          TASK_DONE: {
            actions: [
              "setTask",
              send(
                (_, { task }) => {
                  return { type: "REMOVE_TASK", task: task.id };
                },
                { delay: 200 }
              )
            ]
          }
        }
      },

      local: {
        invoke: {
          src: "getSavedTasks",
          onDone: {
            target: "spawning",
            actions: "setTasks"
          },
          onError: {
            actions: (_, { data }) => console.log(data)
          }
        }
      },

      spawning: {
        always: {
          target: "idle",
          actions: "spawnTasks"
        }
      }
    }
  },
  {
    guards: {
      hasTasks: ({ tasks }) => tasks.size > 0,

      hasPendingTasks: ({ tasks }) => {
        return mapToArray(tasks).some(({ state }) => {
          return state === TaskState.PENDING || state === TaskState.UPLOADING;
        });
      }
    },
    actions: {
      setTask: assign({
        tasks: ({ tasks }, { task }: any) => {
          const newTasks = new Map(tasks);
          newTasks.set(task.id, task);
          return newTasks;
        }
      }),

      removeTask: assign({
        tasks: ({ tasks }, { task }: any) => {
          tasks.delete(task);
          return tasks;
        },
        spawnedTasks: ({ spawnedTasks }, { task }: any) => {
          spawnedTasks.delete(task);
          return spawnedTasks;
        }
      }),

      setTasks: assign({
        tasks: ({ tasks }, { data }: any) => {
          const newTasks = new Map(tasks);

          Object.keys(data).forEach((key) => {
            const task = data[key];
            newTasks.set(key, task);
          });

          return newTasks;
        }
      }),

      // send event to all running tasks
      notifyAllTasks: pure(({ tasks }, e) => {
        return mapToArray(tasks).map((task) => {
          return send(e, { to: task.id });
        });
      }),

      spawnTasks: assign({
        spawnedTasks: ({ tasks, spawnedTasks }) => {
          const spawned = new Map(spawnedTasks);

          tasks.forEach((task) => {
            if (!spawned.has(task.id)) {
              const ctx = { ...taskMachine.context, ...task };
              const actor = spawn(taskMachine.withContext(ctx as any), task.id);
              spawned.set(task.id, actor);
            }
          });

          return spawned;
        }
      })
    },

    services: {
      getSavedTasks: async () => dummyTasks
    }
  }
);

export default new Interpreter(machine).start();
