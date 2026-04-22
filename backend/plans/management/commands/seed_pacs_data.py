from django.core.management.base import BaseCommand
from plans.models import ChecklistTemplate, RequiredDocument, PlanCategory, Department, CategoryDepartmentMapping

class Command(BaseCommand):
    help = 'Seed initial PACS data including departments, checklists and mappings'

    def handle(self, *args, **options):
        self.stdout.write('Seeding PACS data...')

        # 1. Create Departments (if not existing)
        depts_data = [
            {'name': 'Housing Office', 'code': 'HOUSING', 'order': 1},
            {'name': 'Estates Department', 'code': 'ESTATES', 'order': 2},
            {'name': 'Valuation Department', 'code': 'VALUATION', 'order': 3},
            {'name': 'Architectural Section', 'code': 'ARCH', 'order': 4},
            {'name': 'Structural Section', 'code': 'STRUCT', 'order': 5},
            {'name': 'Health Department', 'code': 'HEALTH', 'order': 6},
            {'name': 'Fire Brigade', 'code': 'FIRE', 'order': 7},
            {'name': 'Engineering Services', 'code': 'ENG', 'order': 8},
            {'name': 'Town Planning', 'code': 'PLAN', 'order': 9},
            {'name': 'Water & Sewerage', 'code': 'WATER', 'order': 10},
        ]

        depts = {}
        for d in depts_data:
            dept, created = Department.objects.get_or_create(
                name=d['name'],
                defaults={'code': d['code'], 'display_order': d['order']}
            )
            depts[d['code']] = dept
            if created:
                self.stdout.write(f'Created department: {dept.name}')

        # 2. Create Category -> Department Mappings
        mappings = [
            ('RESIDENTIAL', ['ARCH', 'STRUCT', 'ENG', 'HEALTH']),
            ('COMMERCIAL', ['ARCH', 'STRUCT', 'ENG', 'HEALTH', 'FIRE', 'PLAN']),
            ('INDUSTRIAL', ['ARCH', 'STRUCT', 'ENG', 'HEALTH', 'FIRE', 'PLAN', 'WATER']),
            ('MIXED', ['ARCH', 'STRUCT', 'ENG', 'HEALTH', 'FIRE', 'PLAN']),
        ]

        for cat, codes in mappings:
            for code in codes:
                CategoryDepartmentMapping.objects.get_or_create(
                    category=cat,
                    department=depts[code]
                )
        self.stdout.write('Department mappings updated.')

        # 3. Create Checklist Templates
        templates = [
            ('Residential Standard', 'RESIDENTIAL', [
                ('TITLE_DEED', 'Certified Copy of Title Deed', False),
                ('ARCH_PLANS', 'Architectural Drawings (PDF)', False),
                ('CAD_FILES', 'CAD Source Files (DWG)', False),
                ('RATES_CLEARANCE', 'Recent Rates Clearance / Statement', True),
            ]),
            ('Commercial / Industrial Complex', 'COMMERCIAL', [
                ('TITLE_DEED', 'Certified Copy of Title Deed', False),
                ('ARCH_PLANS', 'Architectural Drawings (PDF)', False),
                ('CAD_FILES', 'CAD Source Files (DWG)', False),
                ('STRUCT_CERT', 'Structural Engineer\'s Certificate', False),
                ('FIRE_PLAN', 'Fire Safety & Protection Plan', False),
                ('RATES_CLEARANCE', 'Recent Rates Clearance / Statement', True),
            ]),
        ]

        for t_name, t_type, docs in templates:
            tmpl, created = ChecklistTemplate.objects.get_or_create(
                name=t_name,
                plan_type=t_type
            )
            if created:
                self.stdout.write(f'Created checklist template: {t_name}')
            
            for code, label, is_rates in docs:
                RequiredDocument.objects.get_or_create(
                    template=tmpl,
                    code=code,
                    defaults={'label': label, 'is_rates_payment': is_rates}
                )

        self.stdout.write(self.style.SUCCESS('Successfully seeded initial PACS data.'))
