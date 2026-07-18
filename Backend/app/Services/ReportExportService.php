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
            $wrapped = wordwrap($text, 96, "\n", true);

            foreach (explode("\n", $wrapped) as $wrappedLine) {
                $wrappedLines[] = $wrappedLine;
            }
        }

        if ($wrappedLines === []) {
            $wrappedLines[] = '';
        }

        $pages = array_chunk($wrappedLines, 44);
        $pageCount = count($pages);
        $pagesObjectId = (2 * $pageCount) + 2;
        $catalogObjectId = $pagesObjectId + 1;

        $objects = [];
        $objects[1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

        foreach ($pages as $index => $pageLines) {
            $contentObjectId = $index + 2;
            $pageObjectId = $pageCount + $index + 2;
            $content = $this->buildPdfPageContent($pageLines);
            $objects[$contentObjectId] = '<< /Length ' . strlen($content) . " >>\nstream\n" . $content . "\nendstream";
            $objects[$pageObjectId] = '<< /Type /Page /Parent ' . $pagesObjectId . ' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 1 0 R >> >> /Contents ' . $contentObjectId . ' 0 R >>';
        }

        $kids = [];
        for ($pageIndex = 0; $pageIndex < $pageCount; $pageIndex++) {
            $kids[] = ($pageCount + $pageIndex + 2) . ' 0 R';
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
        $content = "BT\n/F1 10 Tf\n14 TL\n50 780 Td\n";

        foreach ($lines as $index => $line) {
            $escaped = $this->pdfEscape((string) $line);
            $content .= '(' . $escaped . ') Tj';

            if ($index < count($lines) - 1) {
                $content .= "\nT*\n";
            }
        }

        $content .= "\nET";

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

        foreach ($rows as $row) {
            foreach ($row as $columnIndex => $value) {
                if ($value === null || $value === '') {
                    continue;
                }

                $displayValue = $this->normalizeCellValue($value);
                $displayLength = $this->measureDisplayWidth($displayValue);

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
            $adjustedWidth = min(max($width + 2, 10), 60);
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
