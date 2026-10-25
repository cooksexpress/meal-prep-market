// lib/stats/rpc.ts
//
// Calls a Supabase database function (RPC) by name. Our generated types
// don't list the stats functions (migration 012), so this keeps the call
// sites simple without loosening types elsewhere.

type RpcResult = { data: unknown; error: { message: string } | null };
type AnyRpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;

export function callRpc(
  client: { rpc: unknown },
  fn: string,
  args?: Record<string, unknown>
): PromiseLike<RpcResult> {
  return (client.rpc as AnyRpc).call(client, fn, args);
}
