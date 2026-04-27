import { useRef, useEffect } from "react";

/**
 * Hook that executes a callback when the component unmounts.
 *
 * @param callback Function to be called on component unmount
 */
export const useUnmount = (callback: (...args: any[]) => any) => {
  const ref = useRef(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      ref.current();
    },
    [],
  );
};

export default useUnmount;
