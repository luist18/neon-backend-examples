import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useUser } from "@stackframe/react";

import { usePostgrest } from "@/hooks/postgrest";

export default function GlobalCounter() {
  const postgrest = usePostgrest();
  const user = useUser();
  const queryClient = useQueryClient();

  const { data: globalCounter } = useSuspenseQuery({
    queryKey: ["global-counter"],
    queryFn: async () => {
      const { data, count, error } = await postgrest
        .from("shared_counter")
        .select("*", { count: "exact", head: false })
        .order("added_at", { ascending: false });
      if (error) {
        throw error;
      }
      return { data, count };
    },
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: incrementCounter } = useMutation({
    mutationFn: async () => {
      const { data, error } = await postgrest
        .from("shared_counter")
        .insert({ user_id: user!.id });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-counter"] });
    },
  });

  const { mutate: deleteCounter } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await postgrest
        .from("shared_counter")
        .delete()
        .eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-counter"] });
    },
  });

  return (
    <div>
      <p>
        You are making requests to
        <br />
        <code>{import.meta.env.VITE_NEON_DATA_API_URL}</code>
      </p>
      <h2>
        The shared counter is <code>{globalCounter.count}</code>
      </h2>
      <button onClick={() => incrementCounter()}>Increment</button>
      <table className="global-counter-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Added At</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {globalCounter.data.length === 0 && (
            <tr>
              <td colSpan={3}>No entries yet</td>
            </tr>
          )}
          {globalCounter.data.map(
            (item: { id: string; user_id: string; added_at: string }) => (
              <tr key={item.id}>
                <td>
                  {item.user_id} {user!.id === item.user_id && " (you)"}
                </td>
                <td>{new Date(item.added_at).toLocaleString()}</td>
                <td>
                  <button
                    onClick={() => {
                      if (user!.id !== item.user_id) {
                        alert("You cannot delete entries from other users");
                        return;
                      }
                      deleteCounter(item.id);
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
