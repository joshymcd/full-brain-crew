import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/v2/client";
import { useAtom } from "jotai";
import { RESET, atomWithStorage, createJSONStorage } from "jotai/utils";
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

export type OpencodeAuth = {
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

export const opencodeAuthAtom = atomWithStorage<OpencodeAuth | undefined>(
  OPENCODE_AUTH_STORAGE_KEY,
  undefined,
  createJSONStorage(() => window.sessionStorage),
);

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
  const [auth, setAuth] = useAtom(opencodeAuthAtom);

  const opencodeClient = React.useMemo(() => createClient(auth), [auth]);

  const setOpencodeAuth = React.useCallback(
    (nextAuth: OpencodeAuth) => {
      setAuth(nextAuth);
    },
    [setAuth],
  );

  const clearOpencodeAuth = React.useCallback(() => {
    setAuth(RESET);
  }, [setAuth]);

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
