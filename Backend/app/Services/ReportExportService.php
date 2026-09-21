<?php

namespace App\Services;

use App\Exports\ArrayReportExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;

class ReportExportService
{
    public function downloadCsv(string $filename, array $rows)
    {
        return Excel::download(new ArrayReportExport($rows), $filename, ExcelFormat::CSV);
    }

    public function downloadXlsx(string $filename, array $rows)
    {
        return Excel::download(new ArrayReportExport($rows), $filename, ExcelFormat::XLSX);
    }

    public function downloadPdf(string $filename, string $view, array $data)
    {
        return Pdf::loadView($view, $data)
            ->setPaper('a4', 'landscape')
            ->download($filename);
    }
}
