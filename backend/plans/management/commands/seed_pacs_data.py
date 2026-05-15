from django.core.management.base import BaseCommand
from plans.models import ChecklistTemplate, RequiredDocument, PlanCategory, Department, CategoryDepartmentMapping

class Command(BaseCommand):
    help = 'Seed initial PACS data including departments, checklists and mappings'

    def handle(self, *args, **options):
        self.stdout.write('Seeding PACS data...')

        # 1. Create Departments (if not existing)
        depts_data = [
            {'name': 'Housing Section', 'code': 'HOUSING', 'order': 1, 'is_required': False, 'aliases': ['Housing Office']},
            {'name': 'Estates Section', 'code': 'ESTATES', 'order': 2, 'is_required': False, 'aliases': ['Estates Department']},
            {'name': 'Evaluation Section', 'code': 'EVALUATION', 'order': 3, 'is_required': False, 'aliases': ['Valuation Department']},
            {'name': 'Financial Services Department', 'code': 'FINANCE', 'order': 4, 'is_required': False, 'aliases': ['Financial Services']},
            {'name': 'Building Control Section', 'code': 'BUILDING', 'order': 5, 'is_required': True, 'aliases': ['Building Inspections', 'Structural Section']},
            {'name': 'Water & Sanitation Department', 'code': 'WATER', 'order': 6, 'is_required': True, 'aliases': ['Water & Sewerage']},
            {'name': 'Fire Section', 'code': 'FIRE', 'order': 7, 'is_required': True, 'aliases': ['Fire Brigade', 'Fire & Safety']},
            {'name': 'Trade & Works', 'code': 'TRADE_WORKS', 'order': 8, 'is_required': False, 'aliases': ['Engineering Services']},
            {'name': 'NSSA Compliance', 'code': 'NSSA', 'order': 9, 'is_required': False, 'aliases': []},
            {'name': 'ZESA', 'code': 'ZESA', 'order': 10, 'is_required': False, 'aliases': ['Electrical']},
        ]

        depts = {}
        for d in depts_data:
            dept = (
                Department.objects.filter(code=d['code']).first()
                or Department.objects.filter(name=d['name']).first()
                or Department.objects.filter(name__in=d.get('aliases', [])).first()
            )
            created = False
            if not dept:
                dept = Department.objects.create(
                    name=d['name'],
                    code=d['code'],
                    display_order=d['order'],
                    is_required=d['is_required'],
                )
                created = True
            if not created:
                updated = False
                if dept.name != d['name'] and not Department.objects.filter(name=d['name']).exclude(pk=dept.pk).exists():
                    dept.name = d['name']
                    updated = True
                if dept.code != d['code']:
                    dept.code = d['code']
                    updated = True
                if dept.display_order != d['order']:
                    dept.display_order = d['order']
                    updated = True
                if dept.is_required != d['is_required']:
                    dept.is_required = d['is_required']
                    updated = True
                if updated:
                    dept.save(update_fields=['name', 'code', 'display_order', 'is_required'])
                    self.stdout.write(f"Updated existing department '{dept.name}' with code '{dept.code}' and order '{dept.display_order}'")
            depts[d['code']] = dept
            if created:
                self.stdout.write(f'Created department: {dept.name}')

        # 2. Create Category -> Department Mappings
        mappings = [
            ('RESIDENTIAL', ['BUILDING', 'WATER']),
            ('COMMERCIAL', ['BUILDING', 'WATER', 'FIRE']),
            ('INDUSTRIAL', ['BUILDING', 'WATER', 'FIRE', 'TRADE_WORKS', 'NSSA', 'ZESA']),
            ('MIXED', ['BUILDING', 'WATER', 'FIRE']),
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
