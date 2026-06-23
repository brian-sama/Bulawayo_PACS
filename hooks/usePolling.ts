import { useEffect, useRef } from 'react';

/**
 * Polls `callback` immediately and then every `intervalMs` milliseconds.
 *
 * The callback ref is kept current so callers never need to include it in
 * the dependency list.  Pass `deps` only for values that should restart the
 * interval (e.g. a filter parameter), not for the callback itself.
 */
export const usePolling = (
    callback: () => Promise<void> | void,
    intervalMs: number = 10000,
    deps: readonly any[] = []
) => {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    });

    useEffect(() => {
        let active = true;

        const tick = () => {
            if (active) savedCallback.current();
        };

        tick();
        const id = setInterval(tick, intervalMs);

        return () => {
            active = false;
            clearInterval(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMs, ...deps]);
};
