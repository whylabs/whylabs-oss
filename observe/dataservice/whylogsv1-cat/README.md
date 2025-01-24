# whylogsv1-cat

This project contains a utility to pretty print a WhyLogsV1 file, and is configured in Gradle to be built as a stand-alone app.


### Running from command line:

```bash
jakobs-MacBook-Pro 18:12 $ ./gradlew :whylogsv1-cat:run --args "<absolute path to whylogs file>"
```

e.g.
```bash
./gradlew :whylogsv1-cat:run --args "/Users/jakob/src/whylabs-processing-core/whylogsv1-parser/src/test/resources/profiles/valid/v1-lendingclub.bin"
```

Running via gradle is lame and requires the absolute path.  This is right now just a quick and dirty solution to access the parser, but we should look at improving its packaging and utility.