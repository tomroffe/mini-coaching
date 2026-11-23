#!/bin/sh
# Nightly backup at ~02:00 into ./backups, keeping the last 30 days:
#   crc-YYYY-MM-DD.sql.gz    Postgres dump
#   media-YYYY-MM-DD.tar.gz  uploaded photos / videos (./data/media)
while true; do
  if [ "$(date +%H)" = "02" ]; then
    pg_dump -h db -U crc crc | gzip > "/backups/crc-$(date +%F).sql.gz"
    tar -czf "/backups/media-$(date +%F).tar.gz" -C /media .
    find /backups -name 'crc-*.sql.gz' -mtime +30 -delete
    find /backups -name 'media-*.tar.gz' -mtime +30 -delete
    sleep 3600
  fi
  sleep 600
done
