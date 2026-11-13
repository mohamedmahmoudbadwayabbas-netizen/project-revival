// Offline / unconfigured Supabase stub so the app boots cleanly in AI Studio
// without throwing synchronously when SUPABASE_URL / keys are not yet set.

let warned = false;
function warnOnce(scope: string) {
  if (warned) return;
  warned = true;
  console.warn(`[AI Studio] Supabase is not configured (${scope}) — using in-memory offline stub.`);
}

function createQueryBuilder(isSingleDefault = false): any {
  let singleMode = isSingleDefault;

  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: any) => void, reject?: (err: unknown) => void) => {
            const payload = singleMode
              ? { data: null, error: null, count: 0, status: 200, statusText: "OK" }
              : { data: [], error: null, count: 0, status: 200, statusText: "OK" };
            return Promise.resolve(payload).then(resolve, reject);
          };
        }
        if (prop === "catch") {
          return () => Promise.resolve({ data: singleMode ? null : [], error: null });
        }
        if (prop === "finally") {
          return (fn?: () => void) => Promise.resolve().finally(fn);
        }
        if (prop === "single" || prop === "maybeSingle") {
          return () => {
            singleMode = true;
            return builder;
          };
        }
        return () => builder;
      },
    },
  );

  return builder;
}

export function createMockSupabaseClient(scope = "client"): any {
  warnOnce(scope);

  const mockChannel = () => {
    const ch: any = {
      on: () => ch,
      subscribe: () => ch,
      unsubscribe: async () => "ok",
      send: async () => "ok",
    };
    return ch;
  };

  return {
    from: () => createQueryBuilder(false),
    rpc: async () => ({ data: null, error: null }),
    channel: () => mockChannel(),
    removeChannel: async () => "ok",
    removeAllChannels: async () => [],
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      getClaims: async () => ({ data: null, error: { message: "Supabase not configured" } }),
      onAuthStateChange: () => ({
        data: { subscription: { id: "mock-sub", unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase not configured" },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase not configured" },
      }),
      signOut: async () => ({ error: null }),
      setSession: async () => ({ data: { user: null, session: null }, error: null }),
      refreshSession: async () => ({ data: { user: null, session: null }, error: null }),
      resetPasswordForEmail: async () => ({
        data: {},
        error: { message: "Supabase not configured" },
      }),
      updateUser: async () => ({
        data: { user: null },
        error: { message: "Supabase not configured" },
      }),
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        getUserById: async () => ({ data: { user: null }, error: null }),
        createUser: async () => ({
          data: { user: null },
          error: { message: "Supabase not configured" },
        }),
        deleteUser: async () => ({ data: null, error: null }),
      },
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "Storage not configured" } }),
        createSignedUrl: async () => ({
          data: null,
          error: { message: "Storage not configured" },
        }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: [], error: null }),
      }),
    },
    functions: {
      invoke: async () => ({ data: null, error: { message: "Functions not configured" } }),
    },
  };
}
