'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EVIDENCE_TYPES, EVIDENCE_TYPE_COLORS } from '@/lib/constants/ui';
import { formatDate } from '@/lib/utils/dateFormatting';

interface EvidenceItem {
  id: string;
  documentId: string;
  documentFilename: string;
  type: string;
  content: string;
  rawData: unknown;
  extractedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, typeFilter]);

  const fetchEvidence = async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (typeFilter) params.append('type', typeFilter);
      if (search) params.append('search', search);

      const response = await fetch(`/api/evidence?${params}`);
      const data = await response.json();

      setEvidence(data.items);
      setPagination(data.pagination);
    } catch {
      // Error fetching evidence - will show error state
      setEvidence([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (): void => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchEvidence();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evidence Explorer</h1>
        <p className="text-muted-foreground mt-2">
          View all extracted evidence from uploaded documents
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search evidence content..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={typeFilter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTypeFilter('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                All Types
              </Button>
              {EVIDENCE_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTypeFilter(type);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  {type.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Evidence Table */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence Items</CardTitle>
          <CardDescription>
            {pagination.total} total items • Page {pagination.page} of {pagination.totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : evidence.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>No evidence found</AlertTitle>
              <AlertDescription>
                Upload documents to extract evidence, or adjust your filters
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="w-48">Source</TableHead>
                    <TableHead className="w-40">Extracted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className={EVIDENCE_TYPE_COLORS[item.type] || 'bg-gray-100'}>
                          {item.type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{item.content}</p>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/documents/${item.documentId}`}
                          className="text-sm text-primary hover:underline truncate block"
                        >
                          {item.documentFilename}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(item.extractedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
