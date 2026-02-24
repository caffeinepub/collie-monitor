import { useState, useMemo } from "react";
import { useTradeHistory } from "@/hooks/useQueries";
import type { TradeResult } from "@/backend.d.ts";
import { formatPercent } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResultBadge } from "@/components/ResultBadge";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

export function TradeHistory() {
  const { data: allTrades, isLoading } = useTradeHistory();
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");

  const filteredTrades = useMemo(() => {
    if (!allTrades) return [];

    let filtered = [...allTrades];

    if (moduleFilter !== "all") {
      filtered = filtered.filter((t) => t.moduleName === moduleFilter);
    }

    if (resultFilter !== "all") {
      filtered = filtered.filter((t) => t.result === resultFilter);
    }

    // Sort by tradeId descending (most recent first)
    return filtered.sort((a, b) => Number(b.tradeId - a.tradeId));
  }, [allTrades, moduleFilter, resultFilter]);

  const stats = useMemo(() => {
    if (!allTrades || allTrades.length === 0) {
      return { totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0 };
    }

    const wins = allTrades.filter((t) => t.result === "WIN").length;
    const losses = allTrades.filter((t) => t.result === "LOSS").length;
    const totalPnl = allTrades.reduce((sum, t) => sum + t.finalPnl, 0);

    return {
      totalTrades: allTrades.length,
      wins,
      losses,
      winRate: allTrades.length > 0 ? (wins / allTrades.length) * 100 : 0,
      totalPnl,
    };
  }, [allTrades]);

  const uniqueModules = useMemo(() => {
    if (!allTrades) return [];
    return Array.from(new Set(allTrades.map((t) => t.moduleName)));
  }, [allTrades]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trade History</h1>
        <p className="text-muted-foreground">
          All closed trades and performance summary
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalTrades}</div>
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-success">
              {formatPercent(stats.winRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.wins}W / {stats.losses}L
            </p>
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PnL</CardTitle>
            {stats.totalPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                stats.totalPnl >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatPercent(stats.totalPnl)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                stats.totalTrades > 0 && stats.totalPnl / stats.totalTrades >= 0
                  ? "text-success"
                  : "text-destructive"
              }`}
            >
              {formatPercent(stats.totalTrades > 0 ? stats.totalPnl / stats.totalTrades : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {uniqueModules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="WIN">Wins</SelectItem>
                  <SelectItem value="LOSS">Losses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trade History Table */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle>
            Trade History ({filteredTrades.length}{" "}
            {filteredTrades.length !== stats.totalTrades && `of ${stats.totalTrades}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                No trades yet
              </p>
              <p className="text-sm text-muted-foreground">
                Trades will appear here once strategies start executing
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trade ID</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade) => (
                    <TableRow key={Number(trade.tradeId)}>
                      <TableCell className="font-mono text-muted-foreground">
                        #{Number(trade.tradeId)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {trade.moduleName}
                      </TableCell>
                      <TableCell className="font-mono">{trade.symbol}</TableCell>
                      <TableCell
                        className={`text-right font-mono font-bold ${
                          trade.finalPnl >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {formatPercent(trade.finalPnl)}
                      </TableCell>
                      <TableCell className="text-center">
                        <ResultBadge result={trade.result} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
