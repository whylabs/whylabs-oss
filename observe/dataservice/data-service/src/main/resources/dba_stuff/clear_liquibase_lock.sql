-- If K8 shuts down a machine that holds the lock, it can get stuck. This script fixes that.

select * from DATABASECHANGELOGLOCK;

UPDATE DATABASECHANGELOGLOCK SET LOCKED=false, LOCKGRANTED=null, LOCKEDBY=null where ID=1;
