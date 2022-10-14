export const mapToArray = <Key, Value>(x: Map<Key, Value>) => {
  return Array.from(x.values());
};