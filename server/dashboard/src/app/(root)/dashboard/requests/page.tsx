"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/self-hosted/empty-state";
import { api } from "@/utils/api";
import { REQUEST_ENDPOINTS } from "@/utils/api-endpoints";
import { useApiQuery } from "@/hooks/use-api-query";
import { ApiRequestLog } from "@/types/api";

type RequestLog = {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  authType: string;
};

const PAGE_SIZE = 20;

const getStatusClassName = (statusCode: number) => {
  if (statusCode >= 500) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300";
  }

  if (statusCode >= 400) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300";
};

const getMethodClassName = (method: string) => {
  switch (method.toUpperCase()) {
    case "POST":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-300";
    case "PUT":
    case "PATCH":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300";
    case "DELETE":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300";
    default:
      return "border-memBorder-primary bg-surface-default-secondary text-onSurface-default-secondary";
  }
};

const getAuthLabel = (authType: string) => {
  switch (authType.toLowerCase()) {
    case "bearer":
      return "JWT";
    case "api_key":
      return "API Key";
    case "admin_api_key":
      return "Admin Key";
    case "disabled":
      return "Disabled";
    default:
      return "--";
  }
};

const normalizeLog = (entry: ApiRequestLog): RequestLog => {
  return {
    id: entry.id,
    createdAt: entry.created_at,
    method: entry.method,
    path: entry.path,
    statusCode: entry.status_code,
    latencyMs: entry.latency_ms,
    authType: entry.auth_type,
  };
};

export default function RequestsPage() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const {
    data: pageLogs = [],
    isLoading,
    error,
    refetch,
  } = useApiQuery<RequestLog[]>(
    async () => {
      const res = await api.get<{ results: ApiRequestLog[]; total: number }>(
        REQUEST_ENDPOINTS.BASE,
        { params: { page, per_page: PAGE_SIZE } },
      );
      setLastUpdated(new Date().toISOString());
      setTotal(res.data.total);
      return (res.data.results ?? []).map(normalizeLog);
    },
    { enabled: false, errorToast: "Failed to load request logs", initialData: [] },
  );

  // Fetch on mount and when page changes
  useEffect(() => {
    void refetch();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRequests = total;
  const successfulRequests = pageLogs.filter((log) => log.statusCode < 400).length;
  const successRate =
    pageLogs.length > 0
      ? Math.round((successfulRequests / pageLogs.length) * 100)
      : 0;
  const averageLatency =
    pageLogs.length > 0
      ? Math.round(
          pageLogs.reduce((sum, log) => sum + log.latencyMs, 0) / pageLogs.length,
        )
      : 0;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns = [
    {
      key: "createdAt" as keyof RequestLog,
      label: "Time",
      width: 140,
      render: (value: string) => (
        <span title={format(new Date(value), "PPpp")}>
          {formatDistanceToNow(new Date(value), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "method" as keyof RequestLog,
      label: "Method",
      width: 96,
      render: (value: string) => (
        <Badge variant="outline" className={getMethodClassName(value)}>
          {value.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "path" as keyof RequestLog,
      label: "Path",
      width: 360,
      render: (value: string) => (
        <span className="font-mono text-xs break-all text-onSurface-default-primary">
          {value}
        </span>
      ),
    },
    {
      key: "statusCode" as keyof RequestLog,
      label: "Status",
      width: 120,
      render: (value: number) => (
        <Badge variant="outline" className={getStatusClassName(value)}>
          {value}
        </Badge>
      ),
    },
    {
      key: "latencyMs" as keyof RequestLog,
      label: "Latency",
      width: 100,
      render: (value: number) => <span>{value} ms</span>,
    },
    {
      key: "authType" as keyof RequestLog,
      label: "Auth",
      width: 120,
      render: (value: string) => getAuthLabel(value),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold font-fustat">Requests</h1>
          <p className="text-sm text-onSurface-default-secondary">
            Recent request logs from your self-hosted instance.
          </p>
          {lastUpdated && (
            <p className="text-xs text-onSurface-default-tertiary">
              Last updated{" "}
              {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            void refetch();
          }}
          disabled={isLoading}
        >
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Total Requests", value: totalRequests },
          {
            label: "Success Rate (this page)",
            value: pageLogs.length > 0 ? `${successRate}%` : "--",
          },
          {
            label: "Avg Latency (this page)",
            value: pageLogs.length > 0 ? `${averageLatency} ms` : "--",
          },
        ].map((card) => (
          <Card key={card.label} className="border-memBorder-primary">
            <CardContent className="p-5">
              <p className="text-xs text-onSurface-default-tertiary">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="border-memBorder-primary">
          <CardContent className="p-4 text-sm text-onSurface-danger-primary">
            {error}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : pageLogs.length === 0 && !isLoading ? (
        <EmptyState
          title="No request logs yet"
          description="Requests will appear here once your instance receives traffic."
          image="requests"
        />
      ) : (
        <>
          <Card className="border-memBorder-primary overflow-hidden">
            <DataTable
              data={pageLogs}
              columns={columns}
              getRowKey={(row) => row.id}
            />
          </Card>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-onSurface-default-tertiary">
              <span>
                Page {page} of {totalPages}
                {total > 0 && (
                  <span className="ml-1">
                    ({total} total)
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
