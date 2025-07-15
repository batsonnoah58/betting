import { Card, CardContent } from "@/components/ui/card";

export const GameCardSkeleton = () => {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-4 mb-4 flex flex-col gap-3 animate-pulse">
      <div className="p-6 space-y-4">
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded bg-muted"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
};
