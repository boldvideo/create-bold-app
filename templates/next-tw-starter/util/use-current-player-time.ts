import { useCallback, useSyncExternalStore } from "react";

export const useCurrentPlayerTime = (ref: React.RefObject<any>) => {
  const subscribe = useCallback(
    (onStoreChange: (newVal: number) => void) => {
      const { current } = ref;
      if (!current) {
        return () => undefined;
      }

      const updater = (e: any) => {
        onStoreChange(e.currentTime);
      };
      current.addEventListener("timeupdate", updater);
      return () => {
        current.removeEventListener("timeupdate", updater);
      };
    },
    [ref]
  );

  const data = useSyncExternalStore<number>(
    subscribe,
    () => ref.current?.currentTime ?? 0,
    () => 0
  );

  return data;
};
