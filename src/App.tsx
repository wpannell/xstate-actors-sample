import "./styles.css";

import { useMemo } from "react";
import { useActor } from "@xstate/react";

import { pipe } from "fp-ts/lib/function";
import { filter, join, keys, prop, values } from "ramda";

import manager, { SpawnedActorRef } from "./machines/manager";
import { TaskState } from "./machines/types";

const Task = ({ actor }: { actor: SpawnedActorRef }) => {
  const [current] = useActor(actor);

  const { data, assets, collectedOn, ...rest } = current.context;

  const _assets = useMemo(() => {
    return Array.from(assets.values());
  }, [assets]);

  const filtered = useMemo(() => {
    return pipe(
      data,
      values,
      filter((val) => !!val),
      join(", ")
    );
  }, [data]);

  console.log(
    current.value,
    current.matches("submitted"),
    rest.result,
    rest.state,
    rest.error
  );

  return (
    <div>
      <div style={{ alignItems: "flex-start", flexDirection: "row" }}>
        <div style={{ flex: 5 }}>
          <h2 style={{ textTransform: "capitalize" }}>{filtered}</h2>

          <ul style={{ flexWrap: "wrap", flexDirection: "row" }}>
            {_assets.map(({ id, uri, state }) => {
              return (
                <li key={id} style={{ margin: 4, position: "relative" }}>
                  <img
                    alt={id}
                    src={uri}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 7
                    }}
                  />

                  {state !== TaskState.DONE && (
                    <div
                      style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 7,
                        position: "absolute",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#000000ba"
                      }}
                    >
                      <p>loading</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <h5>Collected on {new Date(collectedOn).toLocaleString()}</h5>
        </div>

        {current.matches("submitting") && <h3>uploading</h3>}

        {current.matches("submitted") && <h3>Done</h3>}
      </div>
    </div>
  );
};

const App = () => {
  const [{ context }] = useActor(manager);

  const { tasks, spawnedTasks } = context;

  const _tasks = useMemo(() => {
    return Array.from(tasks.values()).map(prop("id"));
  }, [tasks]);

  return (
    <main>
      <ul style={{ padding: 10 }}>
        {_tasks.map((id) => {
          const task = spawnedTasks.get(id) as any;

          return (
            <li key={id}>
              <Task actor={task} />
            </li>
          );
        })}
      </ul>
    </main>
  );
};

export default App;
