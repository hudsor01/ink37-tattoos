'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { z } from 'zod';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const csvRowSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.union([z.string().email('Invalid email format'), z.literal('')]).optional(),
  phone: z.string().optional(),
});

type CsvRow = z.infer<typeof csvRowSchema>;

interface ParsedRow {
  raw: Record<string, string>;
  mapped: CsvRow;
  errors: string[];
  isDuplicate: boolean;
}

interface CsvImportDialogProps {
  onImport: (customers: CsvRow[]) => Promise<{ imported: number; skipped: number }>;
  onCheckDuplicates: (emails: string[]) => Promise<string[]>;
  trigger?: React.ReactNode;
}

const REQUIRED_FIELDS = ['firstName', 'lastName'] as const;
const OPTIONAL_FIELDS = ['email', 'phone'] as const;
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

export function CsvImportDialog({
  onImport,
  onCheckDuplicates,
  trigger,
}: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep('upload');
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMapping({});
    setParsedRows([]);
    setImportResult(null);
    setIsChecking(false);
    setSkipDuplicates(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const data = results.data as Record<string, string>[];
        setCsvHeaders(headers);
        setCsvData(data);

        // Auto-map columns by matching names (case-insensitive)
        const autoMap: Record<string, string> = {};
        for (const field of ALL_FIELDS) {
          const match = headers.find(
            (h) => h.toLowerCase().replace(/[_\s-]/g, '') === field.toLowerCase()
          );
          if (match) autoMap[field] = match;
        }
        setColumnMapping(autoMap);

        // If all required fields are auto-mapped, skip to preview
        const allRequiredMapped = REQUIRED_FIELDS.every((f) => autoMap[f]);
        if (allRequiredMapped) {
          validateAndPreview(data, autoMap);
        } else {
          setStep('map');
        }
      },
    });
  }

  function validateAndPreview(data: Record<string, string>[], mapping: Record<string, string>) {
    const rows: ParsedRow[] = data.map((raw) => {
      const mapped: Record<string, string> = {};
      for (const [field, csvHeader] of Object.entries(mapping)) {
        if (csvHeader && raw[csvHeader] !== undefined) {
          mapped[field] = raw[csvHeader].trim();
        }
      }

      const result = csvRowSchema.safeParse(mapped);
      return {
        raw,
        mapped: result.success ? result.data : (mapped as CsvRow),
        errors: result.success
          ? []
          : (result.error?.issues?.map((i) => `${i.path.join('.')}: ${i.message}`) ?? []),
        isDuplicate: false,
      };
    });

    setParsedRows(rows);
    setStep('preview');
  }

  async function handleCheckDuplicates() {
    setIsChecking(true);
    try {
      const emails = parsedRows
        .filter((r) => r.errors.length === 0 && r.mapped.email)
        .map((r) => r.mapped.email!)
        .filter(Boolean);

      if (emails.length === 0) {
        setIsChecking(false);
        return;
      }

      const duplicateEmails = await onCheckDuplicates(emails);
      const dupeSet = new Set(duplicateEmails.map((e) => e.toLowerCase()));

      setParsedRows((prev) =>
        prev.map((row) => ({
          ...row,
          isDuplicate: row.mapped.email
            ? dupeSet.has(row.mapped.email.toLowerCase())
            : false,
        }))
      );
    } finally {
      setIsChecking(false);
    }
  }

  async function handleImport() {
    setStep('importing');
    const validRows = parsedRows
      .filter((r) => r.errors.length === 0)
      .filter((r) => !skipDuplicates || !r.isDuplicate)
      .map((r) => r.mapped);

    try {
      const result = await onImport(validRows);
      setImportResult(result);
      setStep('done');
    } catch {
      setStep('preview');
    }
  }

  function handleMappingConfirm() {
    const allRequiredMapped = REQUIRED_FIELDS.every((f) => columnMapping[f]);
    if (!allRequiredMapped) return;
    validateAndPreview(csvData, columnMapping);
  }

  const validCount = parsedRows.filter((r) => r.errors.length === 0).length;
  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;
  const importableCount = validCount - (skipDuplicates ? duplicateCount : 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) reset();
      }}
    >
      <DialogTrigger
        render={trigger ? <>{trigger}</> : <Button variant="outline" size="sm" />}
      >
        {!trigger && (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Import Customers from CSV'}
            {step === 'map' && 'Map CSV Columns'}
            {step === 'preview' && 'Preview Import'}
            {step === 'importing' && 'Importing...'}
            {step === 'done' && 'Import Complete'}
          </DialogTitle>
        </DialogHeader>

        {/* Upload step */}
        {step === 'upload' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with customer data. Required columns: firstName, lastName.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="text-sm"
            />
          </div>
        )}

        {/* Column mapping step */}
        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to customer fields. Required fields are marked with *.
            </p>
            <div className="space-y-3">
              {ALL_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="w-32 text-sm font-medium">
                    {field}
                    {REQUIRED_FIELDS.includes(field as typeof REQUIRED_FIELDS[number]) && (
                      <span className="text-destructive"> *</span>
                    )}
                  </span>
                  <Select
                    value={columnMapping[field] ?? ''}
                    onValueChange={(val) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field]: val as string,
                      }))
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={handleMappingConfirm}
                disabled={!REQUIRED_FIELDS.every((f) => columnMapping[f])}
              >
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {validCount} valid
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {errorCount} errors
                </Badge>
              )}
              {duplicateCount > 0 && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  {duplicateCount} duplicates
                </Badge>
              )}
            </div>

            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        row.errors.length > 0
                          ? 'bg-red-50'
                          : row.isDuplicate
                            ? 'bg-amber-50'
                            : ''
                      }
                    >
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{row.mapped.firstName}</TableCell>
                      <TableCell>{row.mapped.lastName}</TableCell>
                      <TableCell>{row.mapped.email || '-'}</TableCell>
                      <TableCell>{row.mapped.phone || '-'}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <span className="text-xs text-destructive">{row.errors[0]}</span>
                        ) : row.isDuplicate ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Duplicate</Badge>
                        ) : (
                          <Badge variant="secondary">Valid</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedRows.length > 10 && (
              <p className="text-xs text-muted-foreground">
                Showing first 10 of {parsedRows.length} rows.
              </p>
            )}

            {duplicateCount > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                Skip duplicate rows ({duplicateCount})
              </label>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleCheckDuplicates}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Duplicates'
                )}
              </Button>
              <Button
                onClick={handleImport}
                disabled={importableCount === 0}
              >
                Import {importableCount} customer{importableCount === 1 ? '' : 's'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Importing step */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Importing customers...
            </p>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && importResult && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <div className="text-center">
              <p className="text-lg font-medium">
                {importResult.imported} customer{importResult.imported === 1 ? '' : 's'} imported
              </p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground">
                  {importResult.skipped} skipped (duplicates)
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => { setOpen(false); reset(); }}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
