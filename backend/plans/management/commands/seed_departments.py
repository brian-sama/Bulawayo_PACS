from django.core.management.base import BaseCommand
from plans.models import Department


DEPARTMENTS = [
    {'name': 'Housing Section', 'code': 'HOUSING', 'is_required': False, 'display_order': 1, 'aliases': ['Housing Office']},
    {'name': 'Estates Section', 'code': 'ESTATES', 'is_required': False, 'display_order': 2, 'aliases': ['Estates Department']},
    {'name': 'Evaluation Section', 'code': 'EVALUATION', 'is_required': False, 'display_order': 3, 'aliases': ['Valuation Department']},
    {'name': 'Financial Services Department', 'code': 'FINANCE', 'is_required': False, 'display_order': 4, 'aliases': ['Financial Services']},
    {'name': 'Building Control Section', 'code': 'BUILDING', 'is_required': True, 'display_order': 5, 'aliases': ['Building Inspections', 'Structural Section']},
    {'name': 'Water & Sanitation Department', 'code': 'WATER', 'is_required': True, 'display_order': 6, 'aliases': ['Water & Sewerage']},
    {'name': 'Fire Section', 'code': 'FIRE', 'is_required': True, 'display_order': 7, 'aliases': ['Fire & Safety', 'Fire Brigade']},
    {'name': 'Trade & Works', 'code': 'TRADE_WORKS', 'is_required': False, 'display_order': 8, 'aliases': ['Engineering Services']},
    {'name': 'NSSA Compliance', 'code': 'NSSA', 'is_required': False, 'display_order': 9, 'aliases': []},
    {'name': 'ZESA', 'code': 'ZESA', 'is_required': False, 'display_order': 10, 'aliases': ['Electrical']},
]


def upsert_department(data):
    dept = (
        Department.objects.filter(code=data['code']).first()
        or Department.objects.filter(name=data['name']).first()
        or Department.objects.filter(name__in=data.get('aliases', [])).first()
    )

    created = False
    if not dept:
        dept = Department.objects.create(
            name=data['name'],
            code=data['code'],
            is_required=data['is_required'],
            display_order=data['display_order'],
        )
        created = True
    else:
        changed = False
        if dept.name != data['name'] and not Department.objects.filter(name=data['name']).exclude(pk=dept.pk).exists():
            dept.name = data['name']
            changed = True
        if dept.code != data['code']:
            dept.code = data['code']
            changed = True
        if dept.is_required != data['is_required']:
            dept.is_required = data['is_required']
            changed = True
        if dept.display_order != data['display_order']:
            dept.display_order = data['display_order']
            changed = True
        if changed:
            dept.save(update_fields=['name', 'code', 'is_required', 'display_order'])

    return dept, created


class Command(BaseCommand):
    help = 'Seed the database with default BCC departments and gatekeeper sections'

    def handle(self, *args, **options):
        created = 0
        for dept_data in DEPARTMENTS:
            dept, was_created = upsert_department(dept_data)
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {dept.name}'))
            else:
                self.stdout.write(f'  Up to date: {dept.name}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created} new departments created, {len(DEPARTMENTS) - created} already existed or were updated.'
        ))
