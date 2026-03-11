import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarketData } from "@/hooks/useBinanceApi";
import { calculateMomentumScore } from "@/utils/calculations";
import { formatCompact, formatPercent, formatUSD } from "@/utils/formatters";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Radar,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SignalScanner } from "./SignalScanner";

type SortKey =
  | "symbol"
  | "price"
  | "change24h"
  | "fundingRate"
  | "volume"
  | "momentum";
type SortDirection = "asc" | "desc";

export function MarketsOverview() {
  const navigate = useNavigate();
  const { data: marketData, isLoading } = useMarketData();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("momentum");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    if (!marketData) return [];

    const filteredData = marketData
      .filter(
        (item) =>
          item?.symbol.toLowerCase().includes(search.toLowerCase()) ?? false,
      )
      .map((item) => ({
        ...item,
        momentum: calculateMomentumScore(
          item.change24h,
          item.volume,
          item.fundingRate,
        ),
      }));

    filteredData.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case "symbol":
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "change24h":
          aVal = a.change24h;
          bVal = b.change24h;
          break;
        case "fundingRate":
          aVal = a.fundingRate;
          bVal = b.fundingRate;
          break;
        case "volume":
          aVal = a.volume;
          bVal = b.volume;
          break;
        case "momentum":
          aVal = a.momentum;
          bVal = b.momentum;
          break;
      }

      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filteredData;
  }, [marketData, search, sortKey, sortDirection]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Markets Overview</h1>
        <p className="text-muted-foreground">
          Real-time data for all USDT-M perpetual futures
        </p>
      </div>

      <Tabs defaultValue="markets">
        <TabsList className="mb-4">
          <TabsTrigger
            value="markets"
            data-ocid="markets.tab"
            className="flex items-center gap-2"
          >
            <BarChart2 className="h-4 w-4" />
            Mercados
          </TabsTrigger>
          <TabsTrigger
            value="scanner"
            data-ocid="scanner.tab"
            className="flex items-center gap-2"
          >
            <Radar className="h-4 w-4" />
            Signal Scanner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="space-y-4 mt-0">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search symbol..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle>
                All Markets ({filteredAndSortedData.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:text-primary"
                        onClick={() => handleSort("symbol")}
                      >
                        Symbol{" "}
                        {sortKey === "symbol" &&
                          (sortDirection === "asc" ? "\u2191" : "\u2193")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:text-primary"
                        onClick={() => handleSort("price")}
                      >
                        Price{" "}
                        {sortKey === "price" &&
                          (sortDirection === "asc" ? "\u2191" : "\u2193")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:text-primary"
                        onClick={() => handleSort("change24h")}
                      >
                        24h Change{" "}
                        {sortKey === "change24h" &&
                          (sortDirection === "asc" ? "\u2191" : "\u2193")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:text-primary"
                        onClick={() => handleSort("fundingRate")}
                      >
                        Funding Rate{" "}
                        {sortKey === "fundingRate" &&
                          (sortDirection === "asc" ? "\u2191" : "\u2193")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:text-primary"
                        onClick={() => handleSort("volume")}
                      >
                        Volume (24h){" "}
                        {sortKey === "volume" &&
                          (sortDirection === "asc" ? "\u2191" : "\u2193")}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:text-primary"
                        onClick={() => handleSort("momentum")}
                      >
                        Momentum{" "}
                        {sortKey === "momentum" &&
                          (sortDirection === "asc" ? "\u2191" : "\u2193")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedData.map((item) => (
                      <TableRow
                        key={item.symbol}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          navigate({ to: `/asset/${item.symbol}` })
                        }
                      >
                        <TableCell className="font-medium">
                          {item.symbol}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatUSD(item.price)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            item.change24h >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {item.change24h >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {formatPercent(item.change24h)}
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            item.fundingRate >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {formatPercent(item.fundingRate * 100, 4)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCompact(item.volume)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary">
                          {item.momentum.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scanner" className="mt-0">
          <SignalScanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}
