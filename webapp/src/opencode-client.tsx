import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/v2/client";
import * as React from "react";

const OPENCODE_AUTH_STORAGE_KEY = "opencode-basic-auth";

function defaultOpencodeServerUrl() {
  const { hostname, port, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//opencode.localhost${port ? `:${port}` : ""}/`;
  }

  return `${protocol}//opencode.${window.location.host}/`;
}

const OPENCODE_SERVER_URL = import.meta.env.VITE_OPENCODE_SERVER_URL ?? defaultOpencodeServerUrl();
const OPENCODE_DIRECTORY = import.meta.env.VITE_OPENCODE_DIRECTORY || undefined;

type OpencodeAuth = {
  username: string;
  password: string;
};

export type OpencodeRouterContext = {
  opencodeClient: OpencodeClient;
  opencodeDirectory: string | undefined;
  opencodeServerUrl: string;
  opencodeAuthenticated: boolean;
  setOpencodeAuth: (auth: OpencodeAuth) => void;
  clearOpencodeAuth: () => void;
};

function readStoredAuth(): OpencodeAuth | undefined {
  const stored = window.sessionStorage.getItem(OPENCODE_AUTH_STORAGE_KEY);
  if (!stored) return undefined;

  try {
    return JSON.parse(stored) as OpencodeAuth;
  } catch {
    window.sessionStorage.removeItem(OPENCODE_AUTH_STORAGE_KEY);
    return undefined;
  }
}

function createClient(auth?: OpencodeAuth) {
  return createOpencodeClient({
    baseUrl: OPENCODE_SERVER_URL,
    directory: OPENCODE_DIRECTORY,
    headers: auth
      ? {
          Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
        }
      : undefined,
  });
}

export function useOpencodeRouterContext(): OpencodeRouterContext {
  const [auth, setAuth] = React.useState<OpencodeAuth | undefined>(() => readStoredAuth());

  const opencodeClient = React.useMemo(() => createClient(auth), [auth]);

  const setOpencodeAuth = React.useCallback((nextAuth: OpencodeAuth) => {
    window.sessionStorage.setItem(OPENCODE_AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
  }, []);

  const clearOpencodeAuth = React.useCallback(() => {
    window.sessionStorage.removeItem(OPENCODE_AUTH_STORAGE_KEY);
    setAuth(undefined);
  }, []);

  return React.useMemo(
    () => ({
      opencodeClient,
      opencodeDirectory: OPENCODE_DIRECTORY,
      opencodeServerUrl: OPENCODE_SERVER_URL,
      opencodeAuthenticated: auth !== undefined,
      setOpencodeAuth,
      clearOpencodeAuth,
    }),
    [auth, clearOpencodeAuth, opencodeClient, setOpencodeAuth],
  );
}
