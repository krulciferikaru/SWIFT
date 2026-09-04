<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class ReportExportService
{
    public function downloadPdf(string $filename, array $lines): StreamedResponse
    {
        return response()->streamDownload(function () use ($lines): void {
            echo $this->buildPdfDocument($lines);
        }, $filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    public function downloadXlsx(string $filename, string $sheetName, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($sheetName, $rows): void {
            $tempFile = tempnam(sys_get_temp_dir(), 'swift_report_');

            if ($tempFile === false) {
                throw new RuntimeException('Unable to create a temporary file for the spreadsheet export.');
            }

            $this->writeXlsxFile($tempFile, $sheetName, $rows);

            readfile($tempFile);
            @unlink($tempFile);
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function buildPdfDocument(array $lines): string
    {
        $wrappedLines = [];

        foreach ($lines as $line) {
            $text = (string) $line;

            if (str_contains($text, ' | ')) {
                $wrappedLines[] = $text;
                continue;
            }

            $wrapped = wordwrap($text, 82, "\n", true);

            foreach (explode("\n", $wrapped) as $wrappedLine) {
                $wrappedLines[] = $wrappedLine;
            }
        }

        if ($wrappedLines === []) {
            $wrappedLines[] = '';
        }

        $pages = array_chunk($wrappedLines, 44);
        $pageCount = count($pages);
        $pagesObjectId = (2 * $pageCount) + 3;
        $catalogObjectId = $pagesObjectId + 1;

        $objects = [];
        $objects[1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
        $objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

        foreach ($pages as $index => $pageLines) {
            $contentObjectId = $index + 3;
            $pageObjectId = $pageCount + $index + 3;
            $content = $this->buildPdfPageContent($pageLines);
            $objects[$contentObjectId] = '<< /Length ' . strlen($content) . " >>\nstream\n" . $content . "\nendstream";
            $objects[$pageObjectId] = '<< /Type /Page /Parent ' . $pagesObjectId . ' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> /Contents ' . $contentObjectId . ' 0 R >>';
        }

        $kids = [];
        for ($pageIndex = 0; $pageIndex < $pageCount; $pageIndex++) {
            $kids[] = ($pageCount + $pageIndex + 3) . ' 0 R';
        }

        $objects[$pagesObjectId] = '<< /Type /Pages /Kids [' . implode(' ', $kids) . '] /Count ' . $pageCount . ' >>';
        $objects[$catalogObjectId] = '<< /Type /Catalog /Pages ' . $pagesObjectId . ' 0 R >>';

        $pdf = "%PDF-1.4\n";
        $offsets = [0 => 0];
        $maxObjectId = $catalogObjectId;

        for ($objectId = 1; $objectId <= $maxObjectId; $objectId++) {
            $offsets[$objectId] = strlen($pdf);
            $pdf .= $objectId . " 0 obj\n" . $objects[$objectId] . "\nendobj\n";
        }

        $xrefPosition = strlen($pdf);
        $pdf .= "xref\n0 " . ($maxObjectId + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";

        for ($objectId = 1; $objectId <= $maxObjectId; $objectId++) {
            $pdf .= sprintf('%010d 00000 n ', $offsets[$objectId]) . "\n";
        }

        $pdf .= 'trailer' . "\n";
        $pdf .= '<< /Size ' . ($maxObjectId + 1) . ' /Root ' . $catalogObjectId . ' 0 R >>' . "\n";
        $pdf .= 'startxref' . "\n";
        $pdf .= $xrefPosition . "\n";
        $pdf .= '%%EOF';

        return $pdf;
    }

    private function buildPdfPageContent(array $lines): string
    {
        $content = '';
        $y = 720;
        $leftMargin = 72;
        $rightEdge = 540;

        foreach ($lines as $line) {
            $text = trim((string) $line);

            if ($text === '') {
                $y -= 18;
                continue;
            }

            if (str_contains($text, ' | ')) {
                $cells = array_map('trim', explode(' | ', $text));
                $positions = count($cells) > 6
                    ? [72, 130, 182, 238, 294, 348, 405, 462, 520]
                    : [72, 148, 220, 292, 364, 440];
                $isHeader = strtolower((string) $cells[0]) === 'plan'
                    || strtolower((string) $cells[0]) === 'subscriber'
                    || strtolower((string) $cells[0]) === 'date'
                    || strtolower((string) $cells[0]) === 'method'
                    || strtolower((string) $cells[0]) === 'status'
                    || strtolower((string) $cells[0]) === 'monthly rate';

                foreach ($cells as $cellIndex => $cell) {
                    $x = $positions[min($cellIndex, count($positions) - 1)];
                    $font = $isHeader ? 'F2' : 'F1';
                    $size = $isHeader ? 8.5 : 8.0;
                    $content .= "BT\n/{$font} {$size} Tf\n1 0 0 1 {$x} {$y} Tm\n(" . $this->pdfEscape($cell) . ") Tj\nET\n";
                }

                if ($isHeader) {
                    $content .= "0.7 w\n{$leftMargin} " . ($y - 4) . " m {$rightEdge} " . ($y - 4) . " l S\n";
                }

                $y -= 18;
                continue;
            }

            $font = 'F1';
            $fontSize = 10;
            $x = $leftMargin;
            $leading = 14;

            if (preg_match('/^(Financial Statement|Monthly Collection Report)$/i', $text)) {
                $font = 'F2';
                $fontSize = 18;
                $leading = 22;
            } elseif (preg_match('/^(Summary|Status Snapshot|Collections by Plan|Collections by Method|Payment Ledger|Financial Position by Plan|Subscriber Ledger)$/i', $text)) {
                $font = 'F2';
                $fontSize = 13;
                $leading = 18;
            } elseif (preg_match('/^(Payments:|Paying Subscribers:|Total Collected:|Subscribers:|Total Receivables:|Total Paid:|Outstanding:|Credit:|Active:|Unpaid:|Disconnected:|Months Behind:)/i', $text)) {
                $font = 'F2';
                $fontSize = 10;
                $leading = 16;
            } elseif (str_starts_with($text, 'Period:')) {
                $font = 'F1';
                $fontSize = 10;
                $leading = 16;
            }

            $content .= "BT\n/{$font} {$fontSize} Tf\n1 0 0 1 {$x} {$y} Tm\n(" . $this->pdfEscape($text) . ") Tj\nET\n";
            $y -= $leading;
        }

        return $content;
    }

    private function writeXlsxFile(string $path, string $sheetName, array $rows): void
    {
        $zip = new ZipArchive();

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Unable to create the XLSX archive.');
        }

        $sheetName = $this->sanitizeSheetTitle($sheetName);

        $zip->addFromString('[Content_Types].xml', $this->contentTypesXml());
        $zip->addFromString('_rels/.rels', $this->rootRelationshipsXml());
        $zip->addFromString('xl/workbook.xml', $this->workbookXml($sheetName));
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelationshipsXml());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->worksheetXml($rows, $this->buildColumnsXml($rows)));
        $zip->close();
    }

    private function contentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '</Types>';
    }

    private function rootRelationshipsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbookXml(string $sheetName): string
    {
        $sheetName = $this->xmlEscape($sheetName);

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="' . $sheetName . '" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function workbookRelationshipsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '</Relationships>';
    }

    private function worksheetXml(array $rows, string $columnsXml = ''): string
    {
        $sheetData = '';

        foreach ($rows as $rowIndex => $row) {
            $cells = '';

            foreach ($row as $columnIndex => $value) {
                if ($value === null || $value === '') {
                    continue;
                }

                $cellReference = $this->columnName($columnIndex + 1) . ($rowIndex + 1);

                if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
                    $cells .= '<c r="' . $cellReference . '"><v>' . $this->xmlEscape((string) $value) . '</v></c>';
                    continue;
                }

                $cells .= '<c r="' . $cellReference . '" t="inlineStr"><is><t xml:space="preserve">'
                    . $this->xmlEscape((string) $value)
                    . '</t></is></c>';
            }

            $sheetData .= '<row r="' . ($rowIndex + 1) . '">' . $cells . '</row>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . $columnsXml
            . '<sheetData>' . $sheetData . '</sheetData>'
            . '</worksheet>';
    }

    private function buildColumnsXml(array $rows): string
    {
        $widths = [];
        $headerWidthOverrides = [
            'subscriber id' => 12,
            'name' => 16,
            'plan' => 14,
            'address' => 22,
            'contact number' => 16,
            'email' => 24,
            'mac address' => 18,
            'connection date' => 16,
            'status' => 12,
            'created at' => 18,
        ];

        foreach ($rows as $rowIndex => $row) {
            foreach ($row as $columnIndex => $value) {
                if ($value === null || $value === '') {
                    continue;
                }

                $displayValue = $this->normalizeCellValue($value);
                $displayLength = $this->measureDisplayWidth($displayValue);

                $columnKey = strtolower(trim($displayValue));
                $overrideWidth = $headerWidthOverrides[$columnKey] ?? null;

                if ($rowIndex === 0 && $overrideWidth !== null) {
                    $displayLength = max($displayLength, $overrideWidth);
                }

                if (! isset($widths[$columnIndex]) || $displayLength > $widths[$columnIndex]) {
                    $widths[$columnIndex] = $displayLength;
                }
            }
        }

        if ($widths === []) {
            return '';
        }

        $columnsXml = '<cols>';

        foreach ($widths as $columnIndex => $width) {
            $columnNumber = $columnIndex + 1;
            $baseWidth = min(max($width + 2, 10), 28);
            $adjustedWidth = round($baseWidth, 2);
            $columnsXml .= '<col min="' . $columnNumber . '" max="' . $columnNumber . '" width="' . number_format($adjustedWidth, 2, '.', '') . '" customWidth="1"/>';
        }

        $columnsXml .= '</cols>';

        return $columnsXml;
    }

    private function columnName(int $index): string
    {
        $name = '';

        while ($index > 0) {
            $index--;
            $name = chr(65 + ($index % 26)) . $name;
            $index = intdiv($index, 26);
        }

        return $name;
    }

    private function normalizeCellValue(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'TRUE' : 'FALSE';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return trim((string) $value);
    }

    private function measureDisplayWidth(string $value): int
    {
        if (function_exists('mb_strwidth')) {
            return mb_strwidth($value, 'UTF-8');
        }

        return strlen($value);
    }

    private function sanitizeSheetTitle(string $title): string
    {
        $title = str_replace(['\\', '/', '*', '?', ':', '[', ']'], '-', $title);

        if ($title === '') {
            $title = 'Report';
        }

        return mb_substr($title, 0, 31);
    }

    private function pdfEscape(string $text): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
    }

    private function xmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
