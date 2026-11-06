import openpyxl
from openpyxl.utils import get_column_letter
import json

wb_v = openpyxl.load_workbook('excel_sources/pay slip.xlsx', data_only=True)
wb_f = openpyxl.load_workbook('excel_sources/pay slip.xlsx', data_only=False)

def inspect_vehicle_rows(ws_v, ws_f, col_start, col_end, max_row, name):
    print(f"\n=======================================================")
    print(f"Vehicle Section {name}: Columns {get_column_letter(col_start)} to {get_column_letter(col_end)}")
    print(f"=======================================================")
    
    rows_data = []
    for r in range(1, max_row + 1):
        vals = [ws_v.cell(row=r, column=c).value for c in range(col_start, col_end + 1)]
        forms = [ws_f.cell(row=r, column=c).value for c in range(col_start, col_end + 1)]
        
        # Check if row has any non-empty data
        has_data = any(v is not None and str(v).strip() != '' for v in vals) or any(isinstance(f, str) and f.startswith('=') for f in forms)
        if has_data:
            row_info = {
                'row': r,
                'col1_val': vals[0],
                'col1_form': forms[0],
                'col2_val': vals[1],
                'col2_form': forms[1],
                'col3_val': vals[2],
                'col3_form': forms[2],
                'col4_val': vals[3],
                'col4_form': forms[3],
                'col5_val': vals[4] if len(vals) > 4 else None,
                'col5_form': forms[4] if len(forms) > 4 else None,
            }
            rows_data.append(row_info)
            c1 = f"{vals[0]} (form: {forms[0]})" if forms[0] != vals[0] and forms[0] is not None else f"{vals[0]}"
            c2 = f"{vals[1]} (form: {forms[1]})" if forms[1] != vals[1] and forms[1] is not None else f"{vals[1]}"
            c3 = f"{vals[2]} (form: {forms[2]})" if forms[2] != vals[2] and forms[2] is not None else f"{vals[2]}"
            c4 = f"{vals[3]} (form: {forms[3]})" if forms[3] != vals[3] and forms[3] is not None else f"{vals[3]}"
            c5 = f"{vals[4]} (form: {forms[4]})" if len(vals) > 4 and forms[4] != vals[4] and forms[4] is not None else (f"{vals[4]}" if len(vals) > 4 else "")
            print(f"Row {r:2d} | C1: {c1:25} | C2: {c2:15} | C3: {c3:15} | C4: {c4:25} | C5: {c5}")
    return rows_data

print("--- AUGUST (6182 & 6188) VEHICLE 1 ---")
v1_aug = inspect_vehicle_rows(wb_v['6182 & 6188'], wb_f['6182 & 6188'], 6, 10, wb_v['6182 & 6188'].max_row, "August Vehicle 1 (KA03AQ 5313)")

print("\n--- AUGUST (6182 & 6188) VEHICLE 25 (KA03AP 6182) ---")
v25_aug = inspect_vehicle_rows(wb_v['6182 & 6188'], wb_f['6182 & 6188'], 126, 130, wb_v['6182 & 6188'].max_row, "August Vehicle 25 (KA03AP 6182)")

print("\n--- SEPTEMBER (Pay slip) VEHICLE 1 ---")
v1_sep = inspect_vehicle_rows(wb_v['Pay slip'], wb_f['Pay slip'], 6, 10, wb_v['Pay slip'].max_row, "September Vehicle 1 (KA51AN0511)")

print("\n--- SEPTEMBER (Pay slip) VEHICLE 22 (KA25AC3692) ---")
v22_sep = inspect_vehicle_rows(wb_v['Pay slip'], wb_f['Pay slip'], 111, 115, wb_v['Pay slip'].max_row, "September Vehicle 22 (KA25AC3692)")

