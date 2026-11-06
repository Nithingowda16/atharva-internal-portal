import openpyxl
from openpyxl.utils import get_column_letter
import json

def analyze_sheet_detail(sheet_name):
    wb_v = openpyxl.load_workbook('excel_sources/pay slip.xlsx', data_only=True)
    wb_f = openpyxl.load_workbook('excel_sources/pay slip.xlsx', data_only=False)
    
    ws_v = wb_v[sheet_name]
    ws_f = wb_f[sheet_name]
    
    max_row = ws_v.max_row
    max_col = ws_v.max_column
    
    print(f"\n=======================================================")
    print(f"DETAILED ANALYSIS FOR: {sheet_name}")
    print(f"Max row: {max_row}, Max column: {max_col} ({get_column_letter(max_col)})")
    print(f"=======================================================")
    
    # Let's inspect column A to E (the summary section on the left)
    print("--- Left-side Summary Rows ---")
    for r in range(1, max_row + 1):
        vals = []
        for c in range(1, 6):
            val = ws_v.cell(row=r, column=c).value
            form = ws_f.cell(row=r, column=c).value
            if val is not None or form is not None:
                vals.append(f"{get_column_letter(c)}: val={repr(val)} form={repr(form)}")
        if vals:
            print(f"Row {r:2d}: {' | '.join(vals)}")
            
    # Find vehicle columns
    # In row 7: Vehicle numbers
    # Each vehicle section has 5 columns: e.g. F, G, H, I, J (where J is often a spacer or second total, let's see)
    vehicles = []
    col = 6
    while col <= max_col:
        # Check if there is vehicle information around this col
        reg_val = ws_v.cell(row=7, column=col).value
        # If reg_val is None, check if row 8 is "Company"
        comp_hdr = ws_v.cell(row=8, column=col).value
        type_val = ws_v.cell(row=9, column=col).value
        calc_hdr = ws_v.cell(row=4, column=col).value
        calc_idx = ws_v.cell(row=4, column=col-1).value if col > 1 else None
        period_hdr = ws_v.cell(row=5, column=col).value
        
        if comp_hdr == "Company" or reg_val is not None:
            # Found vehicle section!
            vehicles.append({
                'index': len(vehicles) + 1,
                'calc_idx': calc_idx,
                'calc_hdr': calc_hdr,
                'period': period_hdr,
                'col_start': col,
                'col_letter': get_column_letter(col),
                'reg_number': reg_val,
                'vehicle_type': type_val
            })
            col += 5 # Each vehicle section takes 5 columns
        else:
            col += 1
            
    print(f"\nTotal vehicle sections detected: {len(vehicles)}")
    for v in vehicles:
        print(f"[{v['index']}] Col {v['col_letter']}({v['col_start']}) | Reg: '{v['reg_number']}' | Type: '{v['vehicle_type']}' | Calc: '{v['calc_hdr']}' | Period: '{v['period']}'")
        
    return vehicles

if __name__ == '__main__':
    v1 = analyze_sheet_detail('6182 & 6188')
    v2 = analyze_sheet_detail('Pay slip')
    
    with open('scripts/vehicles_detected.json', 'w') as f:
        json.dump({'august': v1, 'september': v2}, f, indent=2)

