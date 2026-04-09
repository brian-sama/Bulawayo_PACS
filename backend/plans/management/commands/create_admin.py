from django.core.management.base import BaseCommand
from plans.models import User, UserRole


class Command(BaseCommand):
    help = 'Create the initial system administrator account'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            default='admin',
            help='Admin username for login (default: admin)',
        )
        parser.add_argument(
            '--email',
            default='admin@citybyo.co.zw',
            help='Admin email address (default: admin@citybyo.co.zw)',
        )
        parser.add_argument(
            '--password',
            default='bccit',
            help='Admin password (default: bccit)',
        )
        parser.add_argument(
            '--name',
            default='System Administrator',
            help='Admin full name (default: System Administrator)',
        )

    def handle(self, *args, **options):
        username = options['username']
        email    = options['email']
        password = options['password']
        name     = options['name']

        # Check by username first, then email
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Admin user already exists with username: {username}')
            )
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'Admin user already exists with email: {email}')
            )
            return

        user = User.objects.create_user(
            email=email,
            password=password,
            username=username,
            full_name=name,
            role=UserRole.ADMIN,
            is_staff=True,
            is_superuser=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Admin user created successfully!\n'
            f'   Username: {user.username}\n'
            f'   Email   : {user.email}\n'
            f'   Name    : {user.full_name}\n'
            f'   Role    : {user.role}\n'
            f'   Password: {password}\n'
        ))
