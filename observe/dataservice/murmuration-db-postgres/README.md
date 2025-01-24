# whylabs-processing-db

Contains the infrastructure and tooling to support our Postgres-focused data store work.

## Useful links

* [ClickUp epic](https://app.clickup.com/t/3nn9b4h).

## Getting started

We're using `just` as a build helper, install it with:

```bash
> brew install just
```

Install the other preqrequisiting tooling via `just`:

```bash
> just install-tools
```
To pull in our Postgres-with-Apache-Datasketches-support Postgres image:

```bash
> just pull-in-postgres-container
```

## Accessing postgres via docker-compose

> **_NOTE:_**  This area is under rapid development and will be less clunky soon.
> 
To access our custom postgres through the pgadmin web interface locally,

```bash
> just start-local-test-env
```

Wait a few moments for the services to start, then access the local [pgadmin](http://localhost:5050).  Log in with username `root@root.com` and password `root`.  Click on the `WhyLabs (1)` group and enter `root` as the password. 

When done you can shut down the local environment with:
```bash
> just stop-local-test-env
```

## Interesting reading
* [Designing high-performance time series data tables on Amazon RDS for PostgreSQL](https://aws.amazon.com/blogs/database/designing-high-performance-time-series-data-tables-on-amazon-rds-for-postgresql/)
* > With the flexibility of PostgreSQL, there is an index type that fits the time series use case extremely well. The Block Range Index (BRIN) was designed for an access pattern like a time series workload. Instead of tracking each individual time value, a BRIN tracks the minimum and maximum time value over a range of pages in the table. Because a time series table has a natural correlation of time values to the physical pages (because newer rows are appended to the end of the table), a BRIN is very efficient.