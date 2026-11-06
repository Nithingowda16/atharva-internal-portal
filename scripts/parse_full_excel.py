import openpyxl
from openpyxl.utils import get_column_letter
import json

def parse_workbook(file_path):
    wb_v = openpyxl.load_workbook(file_path, data_only=True)
    wb_f = openpyxl.load_workbook(file_path, data_only=False)
    
    workbook_data = {
        'file_path': file_path,
        'sheets': {}
    }
    
    for sheet_name in wb_v.sheetnames:
        ws_v = wb_v[sheet_name]
        ws_f = wb_f[sheet_name]
        max_row = ws_v.max_row
        max_col = ws_v.max_column
        
        sheet_info = {
            'sheet_name': sheet_name,
            'max_row': max_row,
            'max_col': max_col,
            'summary_section': {},
            'vehicles': [],
            'all_cells': [],
            'ref_errors': []
        }
        
        # 1. Capture ALL populated cells into an immutable archive
        for r in range(1, max_row + 1):
            for c in range(1, max_col + 1):
                val = ws_v.cell(row=r, column=c).value
                form = ws_f.cell(row=r, column=c).value
                has_val = val is not None and str(val).strip() != ''
                is_form = isinstance(form, str) and form.startswith('=')
                
                if has_val or is_form:
                    cell_ref = f"{get_column_letter(c)}{r}"
                    cell_record = {
                        'cell': cell_ref,
                        'row': r,
                        'col': c,
                        'value': val if not isinstance(val, (int, float)) else val,
                        'formula': form if is_form else None,
                        'is_ref_error': False
                    }
                    if (is_form and '#REF!' in form) or (has_val and '#REF!' in str(val)):
                        cell_record['is_ref_error'] = True
                        sheet_info['ref_errors'].append({
                            'cell': cell_ref,
                            'formula': form,
                            'value': str(val)
                        })
                    sheet_info['all_cells'].append(cell_record)
                    
        # 2. Extract summary section (columns A-E)
        for r in range(1, max_row + 1):
            row_items = []
            for c in range(1, 6):
                val = ws_v.cell(row=r, column=c).value
                form = ws_f.cell(row=r, column=c).value
                if val is not None or form is not None:
                    row_items.append({
                        'col': get_column_letter(c),
                        'val': val,
                        'form': form
                    })
            if row_items:
                sheet_info['summary_section'][f"row_{r}"] = row_items
                
        # 3. Detect vehicles
        col = 6
        v_idx = 1
        while col <= max_col:
            reg_val = ws_v.cell(row=7, column=col).value
            comp_hdr = ws_v.cell(row=8, column=col).value
            type_val = ws_v.cell(row=9, column=col).value
            calc_hdr = ws_v.cell(row=4, column=col).value
            calc_idx = ws_v.cell(row=4, column=col-1).value if col > 1 else None
            period_hdr = ws_v.cell(row=5, column=col).value
            
            # Check if this is a vehicle block
            if comp_hdr == "Company" or reg_val is not None or (calc_hdr and "Calculation" in str(calc_hdr)):
                vehicle = {
                    'section_index': v_idx,
                    'col_start': col,
                    'col_end': col + 4,
                    'col_letter_start': get_column_letter(col),
                    'col_letter_end': get_column_letter(col + 4),
                    'calc_header': calc_hdr,
                    'calc_index': calc_idx,
                    'period': period_hdr,
                    'registration_number': reg_val, # Note: KA41D 6174 duplicate & missing reg in Aug will be preserved exactly!
                    'vehicle_type': type_val,
                    'billing_lines': [],
                    'total_gross_billing': None,
                    'adjustments': [],
                    'net_payment': None,
                    'payment_date': None,
                    'bank_details': None,
                    'additional_adjustments': [],
                    'remarks': [],
                    'raw_rows': []
                }
                
                # Scan rows for this vehicle
                # Billing rows start at row 10
                # In August, billing rows are 10-15, row 16 is Total
                # In September, billing rows are 10-50, row 51 is Total
                total_row = None
                for r in range(10, max_row + 1):
                    row_label = ws_v.cell(row=r, column=col).value
                    if row_label == 'Total':
                        total_row = r
                        break
                
                if total_row is None:
                    # Default based on sheet
                    total_row = 16 if '6182' in sheet_name else 51
                
                # Extract billing lines (rows 10 to total_row - 1)
                for r in range(10, total_row):
                    comp_name = ws_v.cell(row=r, column=col).value
                    km_val = ws_v.cell(row=r, column=col + 1).value
                    km_form = ws_f.cell(row=r, column=col + 1).value
                    rate_val = ws_v.cell(row=r, column=col + 2).value
                    rate_form = ws_f.cell(row=r, column=col + 2).value
                    tot_val = ws_v.cell(row=r, column=col + 3).value
                    tot_form = ws_f.cell(row=r, column=col + 3).value
                    
                    if comp_name is not None or km_val is not None or rate_val is not None or tot_val is not None:
                        vehicle['billing_lines'].append({
                            'row': r,
                            'company_name': comp_name,
                            'km': km_val,
                            'km_formula': km_form if isinstance(km_form, str) and km_form.startswith('=') else None,
                            'rate': rate_val,
                            'rate_formula': rate_form if isinstance(rate_form, str) and rate_form.startswith('=') else None,
                            'total': tot_val,
                            'total_formula': tot_form if isinstance(tot_form, str) and tot_form.startswith('=') else None
                        })
                        
                # Row total_row is Gross Total
                vehicle['total_gross_billing'] = {
                    'row': total_row,
                    'value': ws_v.cell(row=total_row, column=col + 3).value,
                    'formula': ws_f.cell(row=total_row, column=col + 3).value
                }
                
                # Next rows are adjustments up to 'Total Payment'
                total_pay_row = None
                for r in range(total_row + 1, max_row + 1):
                    lbl = ws_v.cell(row=r, column=col).value
                    if lbl == 'Total Payment':
                        total_pay_row = r
                        break
                        
                if total_pay_row is None:
                    total_pay_row = 31 if '6182' in sheet_name else 63
                    
                for r in range(total_row + 1, total_pay_row):
                    lbl = ws_v.cell(row=r, column=col).value
                    lbl_extra = ws_v.cell(row=r, column=col + 1).value
                    lbl_extra2 = ws_v.cell(row=r, column=col + 2).value
                    adj_val = ws_v.cell(row=r, column=col + 3).value
                    adj_form = ws_f.cell(row=r, column=col + 3).value
                    
                    if lbl is not None or adj_val is not None or adj_form is not None:
                        vehicle['adjustments'].append({
                            'row': r,
                            'category': lbl,
                            'extra_meta': lbl_extra,
                            'extra_meta2': lbl_extra2,
                            'amount': adj_val,
                            'formula': adj_form if isinstance(adj_form, str) and adj_form.startswith('=') else None
                        })
                        
                # Total Payment row
                vehicle['net_payment'] = {
                    'row': total_pay_row,
                    'label': ws_v.cell(row=total_pay_row, column=col).value,
                    'status': ws_v.cell(row=total_pay_row, column=col + 2).value, # e.g. "Paid"
                    'amount': ws_v.cell(row=total_pay_row, column=col + 3).value,
                    'formula': ws_f.cell(row=total_pay_row, column=col + 3).value,
                    'col5_amount': ws_v.cell(row=total_pay_row, column=col + 4).value,
                    'col5_formula': ws_f.cell(row=total_pay_row, column=col + 4).value
                }
                
                # Payment Date and Bank details (row total_pay_row + 1)
                pay_date_lbl = ws_v.cell(row=total_pay_row + 1, column=col).value
                bank_lbl = ws_v.cell(row=total_pay_row + 1, column=col + 3).value
                vehicle['payment_date'] = {
                    'label': pay_date_lbl,
                    'bank': bank_lbl
                }
                
                # Any rows below payment date (post-settlement adjustments, remarks, HOLD, etc.)
                for r in range(total_pay_row + 2, max_row + 1):
                    r_vals = [ws_v.cell(row=r, column=c).value for c in range(col, col + 5)]
                    r_forms = [ws_f.cell(row=r, column=c).value for c in range(col, col + 5)]
                    
                    if any(v is not None and str(v).strip() != '' for v in r_vals) or any(isinstance(f, str) and f.startswith('=') for f in r_forms):
                        vehicle['additional_adjustments'].append({
                            'row': r,
                            'values': r_vals,
                            'formulas': [f if isinstance(f, str) and f.startswith('=') else None for f in r_forms]
                        })
                        # Check for remarks like HOLD, WF, No Accout, etc.
                        for v in r_vals:
                            if isinstance(v, str) and any(kw in v for kw in ['HOLD', 'WF', 'DONE', 'No Accout', 'No Account', 'RAVi', 'penalty', 'payment']):
                                vehicle['remarks'].append({
                                    'row': r,
                                    'remark': v
                                })
                
                sheet_info['vehicles'].append(vehicle)
                v_idx += 1
                col += 5
            else:
                col += 1
                
        workbook_data['sheets'][sheet_name] = sheet_info
        print(f"Sheet '{sheet_name}': Extracted {len(sheet_info['vehicles'])} vehicles, {len(sheet_info['all_cells'])} populated cells, {len(sheet_info['ref_errors'])} REF errors.")
        
    return workbook_data

if __name__ == '__main__':
    data = parse_workbook('excel_sources/pay slip.xlsx')
    
    # Save parsed data (without all_cells to keep size reasonable for json view, and with all_cells in separate archive)
    all_cells_archive = {}
    for sname, sinfo in data['sheets'].items():
        all_cells_archive[sname] = sinfo['all_cells']
        # remove all_cells from main summary
        sinfo['all_cells_count'] = len(sinfo['all_cells'])
        del sinfo['all_cells']
        
    with open('scripts/extracted_workbook_summary.json', 'w') as f:
        json.dump(data, f, indent=2)
        
    with open('scripts/immutable_raw_cells_archive.json', 'w') as f:
        json.dump(all_cells_archive, f)
        
    print("\nSaved extracted_workbook_summary.json and immutable_raw_cells_archive.json successfully!")

