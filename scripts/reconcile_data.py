import json

with open('scripts/extracted_workbook_summary.json') as f:
    data = json.load(f)

for sname, sinfo in data['sheets'].items():
    print(f"\n=======================================================")
    print(f"RECONCILIATION FOR: {sname}")
    print(f"=======================================================")
    
    total_gross = 0
    total_net = 0
    total_fuel = 0
    total_fuel_charge = 0
    total_penalty = 0
    total_tds = 0
    total_bgv = 0
    total_gps = 0
    total_office = 0
    
    vehicles = sinfo['vehicles']
    for v in vehicles:
        gross = v['total_gross_billing']['value']
        if isinstance(gross, (int, float)):
            total_gross += gross
            
        net = v['net_payment']['amount']
        if isinstance(net, (int, float)):
            total_net += net
            
        for adj in v['adjustments']:
            amt = adj['amount']
            cat = adj['category']
            if isinstance(amt, (int, float)):
                if cat == 'Less Fuel Adv.':
                    total_fuel += amt
                elif cat == 'Fuel Handling charge 3%':
                    total_fuel_charge += amt
                elif cat == 'Company Penalty':
                    total_penalty += amt
                elif cat == 'TDS 1%':
                    total_tds += amt
                elif cat == 'BGV Charges':
                    total_bgv += amt
                elif cat == 'GPS Rental':
                    total_gps += amt
                elif cat == 'Office charge':
                    total_office += amt
                    
    print(f"Vehicle sections count: {len(vehicles)}")
    print(f"Sum of Vehicle Gross Billing: {total_gross:,.2f}")
    print(f"Sum of Vehicle Net Payment:   {total_net:,.2f}")
    print(f"Sum of Fuel Advance:          {total_fuel:,.2f}")
    print(f"Sum of Fuel Handling 3%:      {total_fuel_charge:,.2f}")
    print(f"Sum of Company Penalties:     {total_penalty:,.2f}")
    print(f"Sum of TDS 1%:                {total_tds:,.2f}")
    print(f"Sum of BGV Charges:           {total_bgv:,.2f}")
    print(f"Sum of GPS Rental:            {total_gps:,.2f}")
    print(f"Sum of Office Charges:        {total_office:,.2f}")
    
    # Check left-hand summary rows
    summary = sinfo['summary_section']
    print("\nLeft-hand Summary Section comparison:")
    for row_k, row_v in summary.items():
        row_str = " | ".join([f"{it['col']}={it['val']}" for it in row_v])
        if any(kw in row_str for kw in ['Total', 'Fuel', 'PENALTY', 'TDS', 'BGV', 'GPS', 'Office', 'PAY', '1165826', '510433']):
            print(f"  {row_k}: {row_str}")

