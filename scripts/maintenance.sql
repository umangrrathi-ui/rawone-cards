-- Nightly housekeeping (run by scripts/backup.sh after the dump).
-- Retention, as promised in the privacy policy:
DELETE FROM card_events WHERE created_at < UTC_TIMESTAMP() - INTERVAL 13 MONTH;
DELETE FROM email_codes WHERE expires_at < UTC_TIMESTAMP() - INTERVAL 1 DAY;
DELETE FROM audit_log   WHERE created_at < UTC_TIMESTAMP() - INTERVAL 2 YEAR;
-- Signups that never verified their email.
DELETE FROM users WHERE status = 'pending' AND created_at < UTC_TIMESTAMP() - INTERVAL 7 DAY;
