# Backup & Restore

## Database Backup (mysqldump)
Use a least-privileged MySQL user with read access and run:

```sh
mysqldump --host <db-host> --user <db-user> --password \
  --single-transaction --routines --events --triggers \
  <db-name> > gymas-YYYYMMDD.sql
```

Notes:
- `--single-transaction` avoids locking for InnoDB tables.
- Store backups in encrypted, access-controlled storage.

## Database Restore
1. Create the target database if it does not exist.
2. Restore from the backup:

```sh
mysql --host <db-host> --user <db-user> --password <db-name> < gymas-YYYYMMDD.sql
```

## Media Backup
Media files live at `storage/media` on the application host.

Example (Linux):
```sh
tar -czf gymas-media-YYYYMMDD.tar.gz storage/media
```

Example (Windows PowerShell):
```powershell
Compress-Archive -Path storage\media\* -DestinationPath gymas-media-YYYYMMDD.zip
```

## Restore Media
- Extract the archive back into `storage/media`.
- Ensure the directory is writable by the app user.

## Restore Drill Checklist
- Restore the database backup into a staging environment.
- Restore the `storage/media` archive.
- Start the app and run smoke tests from `RELEASE_CHECKLIST.md`.
- Verify images load and recent records appear.
- Record the total time to restore and any gaps found.
