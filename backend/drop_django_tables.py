import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='Brian7350$@#',
    database='bcc_plans'
)
cur = conn.cursor()
cur.execute('SET FOREIGN_KEY_CHECKS=0')

tables = [
    'django_migrations',
    'django_content_type',
    'auth_permission',
    'plans_user_groups',
    'plans_user_user_permissions',
]

for t in tables:
    cur.execute(f'DROP TABLE IF EXISTS `{t}`')
    print(f'Dropped: {t}')

cur.execute('SET FOREIGN_KEY_CHECKS=1')
conn.commit()
conn.close()
print('Done.')
