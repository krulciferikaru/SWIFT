<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ArrayReportExport implements FromArray, WithColumnWidths, WithStyles
{
    public function __construct(private array $rows)
    {
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function columnWidths(): array
    {
        $widths = [];

        foreach ($this->rows as $row) {
            foreach ($row as $columnIndex => $value) {
                $widths[$columnIndex] = max(
                    $widths[$columnIndex] ?? 0,
                    min(max(mb_strwidth((string) $value) + 2, 10), 32)
                );
            }
        }

        $columns = [];

        foreach ($widths as $columnIndex => $width) {
            $columns[$this->columnName($columnIndex + 1)] = $width;
        }

        return $columns;
    }

    public function styles(Worksheet $sheet): array
    {
        $highestRow = $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn();
        $sectionRows = [];
        $headingRows = [];
        $titleRows = [];

        for ($rowNumber = 1; $rowNumber <= $highestRow; $rowNumber++) {
            $values = $sheet->rangeToArray("A{$rowNumber}:{$highestColumn}{$rowNumber}", null, true, false)[0];
            $firstValue = trim((string) ($values[0] ?? ''));
            $nonEmptyValues = array_values(array_filter($values, static fn ($value) => $value !== null && $value !== ''));

            if ($rowNumber === 1 && count($nonEmptyValues) === 1) {
                $titleRows[] = $rowNumber;
            } elseif (count($nonEmptyValues) === 1 && $firstValue !== '') {
                $sectionRows[] = $rowNumber;
            } elseif ($rowNumber > 1 && $this->isHeaderRow($values)) {
                $headingRows[] = $rowNumber;
            }
        }

        $styles = [
            "A1:{$highestColumn}{$highestRow}" => [
                'alignment' => ['vertical' => 'top'],
            ],
        ];

        foreach ($titleRows as $rowNumber) {
            $styles["A{$rowNumber}:{$highestColumn}{$rowNumber}"] = [
                'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '1F4E78']],
            ];
        }

        foreach ($sectionRows as $rowNumber) {
            $styles["A{$rowNumber}:{$highestColumn}{$rowNumber}"] = [
                'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => '1F4E78']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'D9EAF7']],
            ];
        }

        foreach ($headingRows as $rowNumber) {
            $styles["A{$rowNumber}:{$highestColumn}{$rowNumber}"] = [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '5B7894']],
                'borders' => ['bottom' => ['borderStyle' => 'thin', 'color' => ['rgb' => '38566F']]],
            ];
        }

        return $styles;
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

    private function isHeaderRow(array $values): bool
    {
        $firstValue = strtolower(trim((string) ($values[0] ?? '')));

        return in_array($firstValue, [
            'subscriber id',
            'name',
            'plan',
            'date',
            'method',
            'subscriber',
            'status',
            'active',
            'payments',
        ], true);
    }
}