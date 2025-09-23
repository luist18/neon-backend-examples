import React, { useMemo } from "react";

import { PostgrestClient } from "@supabase/postgrest-js";
import { useUser } from "@stackframe/react";
import { useSuspenseQuery } from "@tanstack/react-query";

type PostgrestProviderConfig = {
  postgrestUrl: string;
};

export const PostgrestContext =
  React.createContext<PostgrestProviderConfig | null>(null);

export function usePostgrest(): PostgrestClient {
  const postgrestUrl = import.meta.env.VITE_NEON_DATA_API_URL as
    | string
    | undefined;
  if (!postgrestUrl) {
    throw new Error(
      "PostgrestProvider: Missing VITE_NEON_DATA_API_URL environment variable."
    );
  }

  const user = useUser();
  // Only allow using the postgrest client if the user is authenticated
  // TODO: once we support anonymous users, remove this and use the anonymous token for the client
  if (user === null) {
    throw new Error(
      "usePostgrest: No authenticated user available; sign in first."
    );
  }

  const { data: tokens } = useSuspenseQuery({
    queryKey: ["stack-auth-json", user.id],
    queryFn: () => user.getAuthJson(),
    staleTime: 60_000, // Refresh the token every minute
  });

  const accessToken = tokens?.accessToken ?? null;
  if (!accessToken) {
    throw new Error("usePostgrest: No access token available from Stack auth.");
  }

  const client = useMemo(() => {
    return new PostgrestClient(postgrestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }, [accessToken, postgrestUrl]);

  return client;
}
