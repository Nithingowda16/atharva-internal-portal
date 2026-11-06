import openpyxl
from openpyxl.utils import get_column_letter
import json

def analyze_sheet_structure(file_path, sheet_name):
    wb_val = openpyxl.load_workbook(file_path, data_only=True)
    wb_form = openpyxl.load_workbook(file_path, data_only=False)
    ws_v = wb_val[sheet_name]
    ws_f = wb_form[sheet_name]
    
    max_row = ws_v.max_row
    max_col = ws_v.max_column
    
    print(f"\n=======================================================")
    print(f"Sheet: {sheet_name} (Max row: {max_row}, Max col: {max_col})")
    print(f"=======================================================")
    
    # Let's inspect rows 1 to 15 across all columns to detect vehicle sections
    # Notice in the CSV posted earlier:
    # Row 4 has: "1,AUG-26 Payment Calculation,,,,2,AUG-26 Payment Calculation..."
    # Row 5 has: "Payment for 01st AUG to 31st AUG 2026..."
    # Row 6 has: "ATHARVA TRAVELS..."
    # Row 7 has vehicle numbers: "KA03AQ 5313", "KA04AE 7943", ...
    # Row 8 has: "Company,KM,Rates,Total"
    # Row 9 has: "Vehicle - 4-Seater" or "Vehicle - 6-Seater"
    
    # Let's detect column ranges for each vehicle section
    vehicle_sections = []
    
    # Scan row 7 (and nearby rows 4-8) for vehicle registrations
    # Typically vehicle blocks might be 4 or 5 columns wide, e.g. Company, KM, Rates, Total, blank
    
    # Let's print out rows 1 to 12 for the first 30 columns
    print("\n--- Rows 1-10 for columns A to Z ---")
    for r in range(1, 11):
        vals = [f"{get_column_letter(c)}:{ws_v.cell(row=r, column=c).value}" for c in range(1, 26) if ws_v.cell(row=r, column=c).value is not None]
        if vals:
            print(f"Row {r}: {', '.join(vals)}")
            
    # Let's find all vehicle headers
    # Scan row 4 to 8
    for c in range(1, max_col + 1):
        v7 = ws_v.cell(row=7, column=c).value
        v8 = ws_v.cell(row=8, column=c).value
        v9 = ws_v.cell(row=9, column=c).value
        v4 = ws_v.cell(row=4, column=c).value
        v5 = ws_v.cell(row=5, column=c).value
        v6 = ws_v.cell(row=6, column=c).value
        
        # Check if row 8 is "Company" or row 7 has vehicle registration
        if v8 == "Company" or (isinstance(v7, str) and ("KA" in v7 or len(v7.strip()) > 3)):
            vehicle_sections.append({
                'start_col_idx': c,
                'col_letter': get_column_letter(c),
                'row4_calc': v4,
                'row5_period': v5,
                'row6_title': v6,
                'row7_vehicle_no': v7,
                'row8_company_hdr': v8,
                'row9_vehicle_type': v9
            })
            
    print(f"\nFound {len(vehicle_sections)} vehicle section candidate start columns in {sheet_name}:")
    for idx, vs in enumerate(vehicle_sections):
        print(f"Section {idx+1}: Col {vs['col_letter']} ({vs['start_col_idx']}) -> Reg: '{vs['row7_vehicle_no']}', Type: '{vs['row9_vehicle_type']}', Period: '{vs['row5_period']}'")

    # Let's check row labels (typically column A or B or C)
    print("\n--- Row Labels in Columns A-E (First 60 rows) ---")
    for r in range(1, min(65, max_row + 1)):
        left_vals = [f"Col{get_column_letter(c)}={ws_v.cell(row=r, column=c).value}" for c in range(1, 6) if ws_v.cell(row=r, column=c).value is not None]
        if left_vals:
            print(f"Row {r:2d}: {', '.join(left_vals)}")

    # Let's check formula errors in this sheet
    errors = []
    for r in range(1, max_row + 1):
        for c in range(1, max_col + 1):
            f_val = ws_f.cell(row=r, column=c).value
            v_val = ws_v.cell(row=r, column=c).value
            if (isinstance(f_val, str) and '#REF!' in f_val) or (isinstance(v_val, str) and '#REF!' in v_val):
                errors.append({
                    'cell': f"{get_column_letter(c)}{r}",
                    'row': r,
                    'col': c,
                    'formula': str(f_val),
                    'calculated_value': str(v_val)
                })
    print(f"\nFound {len(errors)} #REF! errors in sheet {sheet_name}")
    for err in errors[:15]:
        print(f"  Error at {err['cell']}: Formula={err['formula']} | Value={err['calculated_value']}")
    if len(errors) > 15:
        print(f"  ... and {len(errors) - 15} more.")

    return {
        'sheet_name': sheet_name,
        'vehicle_sections': vehicle_sections,
        'errors': errors,
        'max_row': max_row,
        'max_col': max_col
    }

if __name__ == '__main__':
    fpath = 'excel_sources/pay slip.xlsx'
    wb = openpyxl.load_workbook(fpath, data_only=True)
    res = {}
    for sname in wb.sheetnames:
        res[sname] = analyze_sheet_structure(fpath, sname)
        
    with open('scripts/deep_sheet_analysis.json', 'w') as f:
        json.dump(res, f, indent=2)
    print("\nAnalysis complete! Saved to scripts/deep_sheet_analysis.json")

