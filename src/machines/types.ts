import { SpawnedActorRef, State as StateType } from "xstate";

import {
  Context as TaskContext,
  Events as TaskEvents,
  States as TaskStates
} from "./task";

export enum TaskState {
  PENDING = "pending",
  UPLOADING = "uploading",
  DONE = "done"
}

export type File = {
  uri: string;
  type: string;
  fileName: string;
};

export type Asset = File & {
  id: string;
  result?: any;
  progress: number;
  state: TaskState;
};

export type Task = {
  id: string;
  mocked: boolean;
  state: TaskState;
  collectedOn: Date;
  data: Record<string, any>;
  assets: Map<string, Asset>;
  geometry: Record<"latitude" | "longitude", number>;
};

export type Tasks = Map<string, Task>;

export type TaskRef = SpawnedActorRef<
  TaskEvents,
  StateType<TaskContext, TaskEvents, TaskStates>
>;
