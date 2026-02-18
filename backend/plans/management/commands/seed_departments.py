from django.core.management.base import BaseCommand
from plans.models import Department


DEPARTMENTS = [
    {'name': 'Town Planning',        'is_required': True,  'display_order': 1},
    {'name': 'Building Inspections', 'is_required': True,  'display_order': 2},
    {'name': 'Engineering',          'is_required': True,  'display_order': 3},
    {'name': 'Environmental Health', 'is_required': True,  'display_order': 4},
    {'name': 'Fire & Safety',        'is_required': True,  'display_order': 5},
    {'name': 'Water & Sanitation',   'is_required': False, 'display_order': 6},
    {'name': 'Electrical',           'is_required': False, 'display_order': 7},
]


class Command(BaseCommand):
    help = 'Seed the database with default BCC departments'

    def handle(self, *args, **options):
        created = 0
        for dept_data in DEPARTMENTS:
            _, was_created = Department.objects.get_or_create(
                name=dept_data['name'],
                defaults={
                    'is_required':    dept_data['is_required'],
                    'display_order':  dept_data['display_order'],
                }
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {dept_data["name"]}'))
            else:
                self.stdout.write(f'  Already exists: {dept_data["name"]}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {created} new departments created, {len(DEPARTMENTS) - created} already existed.'
        ))
