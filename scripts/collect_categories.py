import json

with open('scripts/extracted_workbook_summary.json') as f:
    data = json.load(f)

companies = set()
adjustments = set()
remarks = set()
rates_by_company = {}

for sname, sinfo in data['sheets'].items():
    for v in sinfo['vehicles']:
        for bl in v['billing_lines']:
            cname = bl['company_name']
            if cname:
                companies.add(cname.strip())
                if cname.strip() not in rates_by_company:
                    rates_by_company[cname.strip()] = set()
                if bl['rate'] is not None:
                    rates_by_company[cname.strip()].add(str(bl['rate']))
                    
        for adj in v['adjustments']:
            acat = adj['category']
            if acat:
                adjustments.add(acat.strip())
                
        for rem in v['remarks']:
            rtext = rem['remark']
            if rtext:
                remarks.add(rtext.strip())
                
        for add_adj in v['additional_adjustments']:
            for val in add_adj['values']:
                if isinstance(val, str) and not val.startswith('='):
                    if any(kw in val for kw in ['HOLD', 'WF', 'DONE', 'No', 'penalty', 'fuel', 'Charge', 'Rent', 'RAVi', 'Less']):
                        remarks.add(val.strip())

print(f"Unique Companies ({len(companies)}):")
for c in sorted(companies):
    print(f"  - {c} -> Rates: {sorted(list(rates_by_company[c]))}")

print(f"\nUnique Adjustments ({len(adjustments)}):")
for a in sorted(adjustments):
    print(f"  - {a}")

print(f"\nUnique Remarks and Extra Items ({len(remarks)}):")
for r in sorted(remarks):
    print(f"  - {r}")

