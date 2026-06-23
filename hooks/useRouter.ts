import { useState, useCallback, useEffect } from 'react';

export type RouteParams = Record<string, string>;

export interface RouteState {
  path: string;
  params: RouteParams;
}

export const useRouter = (initialPath: string = '/') => {
  const [routeState, setRouteState] = useState<RouteState>(() => {
    const loc = window.location.pathname;
    return { path: loc !== '/' ? loc : initialPath, params: {} };
  });

  const navigate = useCallback((path: string, params: RouteParams = {}) => {
    setRouteState({ path, params });
    // Update browser URL without full reload
    const url =
      Object.keys(params).length > 0
        ? path + '?' + new URLSearchParams(params).toString()
        : path;
    window.history.pushState({ path, params }, '', url);
  }, []);

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (e.state) setRouteState(e.state as RouteState);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  return { ...routeState, navigate };
};
