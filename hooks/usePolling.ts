import { useEffect, useRef } from 'react';

/**
 * usePolling hook to execute an action repeatedly at a fixed interval.
 * @param callback The async function to call
 * @param intervalMs The interval in milliseconds (default: 10000ms)
 * @param dependencies Optional dependencies that trigger a reset
 */
export const usePolling = (
    callback: () => Promise<void> | void,
    intervalMs: number = 10000,
    dependencies: any[] = []
) => {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        const tick = () => {
            savedCallback.current();
        };

        // Initial call
        tick();

        const id = setInterval(tick, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs, ...dependencies]);
};
