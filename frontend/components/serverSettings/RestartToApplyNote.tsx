import { RefreshCw } from 'lucide-react';

// Compact, game-agnostic hint: changes to a game's config/mods only take effect on
// the next start, so this appears ONLY while the server is running. Kept light on
// purpose (a single line, not a boxed banner) so it doesn't weigh the page down.
export function RestartToApplyNote({ serverStatus }: { serverStatus?: string | null }) {
  if (serverStatus !== 'running') return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
      <RefreshCw className="h-4 w-4 flex-shrink-0" />
      <span>Restart the server to apply your changes.</span>
    </div>
  );
}
