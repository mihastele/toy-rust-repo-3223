interface TauriInvokeOptions {
  callback?: (response: any) => void;
  error?: (error: any) => void;
}

interface Window {
  __TAURI__: {
    invoke: <T = any>(cmd: string, args?: Record<string, unknown>, options?: TauriInvokeOptions) => Promise<T>;
  };
}
