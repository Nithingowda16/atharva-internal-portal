import os
import openpyxl
from openpyxl.utils import get_column_letter
import json

def inspect_workbook(file_path):
    print(f"=== Inspecting: {file_path} ===")
    wb_val = openpyxl.load_workbook(file_path, data_only=True)
    wb_form = openpyxl.load_workbook(file_path, data_only=False)
    
    print(f"Worksheets: {wb_val.sheetnames}")
    
    total_populated_cells = 0
    total_formulas = 0
    total_ref_errors = 0
    
    sheet_reports = {}
    
    for sheetname in wb_val.sheetnames:
        ws_val = wb_val[sheetname]
        ws_form = wb_form[sheetname]
        
        populated_cells = 0
        formulas = 0
        ref_errors = 0
        ref_error_locations = []
        
        max_row = max(ws_val.max_row, ws_form.max_row)
        max_col = max(ws_val.max_column, ws_form.max_column)
        
        # Look for vehicle blocks
        # Let's see rows 1 to 15 to understand vehicle headers
        header_rows = {}
        for r in range(1, min(15, max_row + 1)):
            row_vals = [ws_val.cell(row=r, column=c).value for c in range(1, min(60, max_col + 1))]
            # filter non-null
            non_null = [(c, v) for c, v in enumerate(row_vals, 1) if v is not None and str(v).strip() != '']
            if non_null:
                header_rows[r] = non_null[:10]
        
        # Scan all cells
        for r in range(1, max_row + 1):
            for c in range(1, max_col + 1):
                val = ws_val.cell(row=r, column=c).value
                form = ws_form.cell(row=r, column=c).value
                
                is_formula = isinstance(form, str) and form.startswith('=')
                has_val = val is not None and str(val).strip() != ''
                
                if has_val or is_formula:
                    populated_cells += 1
                
                if is_formula:
                    formulas += 1
                    if '#REF!' in form or '#REF!' in str(val):
                        ref_errors += 1
                        ref_error_locations.append({
                            'cell': f"{get_column_letter(c)}{r}",
                            'formula': form,
                            'value': str(val)
                        })
                elif has_val and '#REF!' in str(val):
                    ref_errors += 1
                    ref_error_locations.append({
                        'cell': f"{get_column_letter(c)}{r}",
                        'formula': str(form),
                        'value': str(val)
                    })
                    
        total_populated_cells += populated_cells
        total_formulas += formulas
        total_ref_errors += ref_errors
        
        sheet_reports[sheetname] = {
            'max_row': max_row,
            'max_column': max_col,
            'populated_cells': populated_cells,
            'formulas': formulas,
            'ref_errors': ref_errors,
            'sample_ref_errors': ref_error_locations[:10],
            'header_preview': header_rows
        }
        
    return {
        'file': file_path,
        'sheets': wb_val.sheetnames,
        'total_populated_cells': total_populated_cells,
        'total_formulas': total_formulas,
        'total_ref_errors': total_ref_errors,
        'sheet_reports': sheet_reports
    }

if __name__ == '__main__':
    os.makedirs('scripts', exist_ok=True)
    report1 = inspect_workbook('excel_sources/ECO-SEP_Pay Slip (1).xlsx')
    report2 = inspect_workbook('excel_sources/pay slip.xlsx')
    
    print("\n--- Summary 1 ---")
    print(f"File 1 populated: {report1['total_populated_cells']}, formulas: {report1['total_formulas']}, ref_errors: {report1['total_ref_errors']}")
    print("\n--- Summary 2 ---")
    print(f"File 2 populated: {report2['total_populated_cells']}, formulas: {report2['total_formulas']}, ref_errors: {report2['total_ref_errors']}")
    
    with open('scripts/excel_inspection_summary.json', 'w') as f:
        json.dump({'file1': report1, 'file2': report2}, f, indent=2)
    print("Saved inspection summary to scripts/excel_inspection_summary.json")

