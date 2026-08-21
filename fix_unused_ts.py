import re, os

files_to_check = [
    'app/(tabs)/pos.tsx',
    'app/(tabs)/settings.tsx',
    'app/(tabs)/reports.tsx',
    'app/(tabs)/debt.tsx',
    'src/components/app-menu/app-menu.tsx',
    'src/components/bottom-tab-bar/bottom-tab-bar.tsx',
    'src/components/inventory/step-barcode.tsx',
    'src/components/inventory/wizard-footer.tsx',
    'src/components/inventory/wizard-header.tsx',
    'src/components/pos/receipt-view.tsx',
    'src/components/reports/export-modal.tsx',
    'src/components/reports/filter-row.tsx',
    'src/components/reports/payment-badge.tsx',
    'src/components/reports/sale-detail-modal.tsx',
    'src/components/reports/sale-row.tsx',
    'src/components/reports/simple-bar-chart.tsx',
    'src/components/shared/app-header.tsx',
    'src/components/shared/add-customer-modal.tsx',
]

for fname in files_to_check:
    if not os.path.exists(fname):
        continue
    lines = open(fname, 'r', encoding='utf-8').readlines()
    modified = False
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith('// @ts-expect-error') or stripped.startswith('// @ts-ignore'):
            # Check if this comment is directly above a line that has 'color:' in it (a valid suppression)
            if i + 1 < len(lines):
                next_line = lines[i+1]
                if 'color:' not in next_line:
                    # This suppression is not above a color prop - check if it's unused
                    # Remove it
                    lines[i] = ''
                    modified = True
                    print(f'Removed unused suppression from {fname}:{i+1}')
        i += 1
    if modified:
        open(fname, 'w', encoding='utf-8').writelines(lines)
print('Done')
