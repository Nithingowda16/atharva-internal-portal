import openpyxl
from openpyxl.utils import get_column_letter
import json

wb_v = openpyxl.load_workbook('excel_sources/pay slip.xlsx', data_only=True)
wb_f = openpyxl.load_workbook('excel_sources/pay slip.xlsx', data_only=False)

s1_v = wb_v['6182 & 6188']
s1_f = wb_f['6182 & 6188']

errors = []
for r in range(1, s1_f.max_row + 1):
    for c in range(1, s1_f.max_column + 1):
        f = s1_f.cell(row=r, column=c).value
        v = s1_v.cell(row=r, column=c).value
        if (isinstance(f, str) and '#REF!' in f) or (isinstance(v, str) and '#REF!' in v):
            errors.append({
                'cell': f"{get_column_letter(c)}{r}",
                'row': r,
                'col': c,
                'formula': str(f),
                'value': str(v)
            })

print(f"Total #REF! errors found in '6182 & 6188': {len(errors)}")
for idx, err in enumerate(errors):
    print(f"{idx+1}. {err['cell']} | Formula: {err['formula']} | Value: {err['value']}")

with open('scripts/ref_errors_august.json', 'w') as f:
    json.dump(errors, f, indent=2)

