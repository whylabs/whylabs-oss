# WhyLabs Secure

WhyLabs Secure consists of three major components:

* [whylogs-container-python](https://github.com/whylabs/whylogs-container-python): provides the LLM guard rails. 
* [llm-toolkit](./llm-toolkit/README.md): provides various toolkits and training pipelines for the vector database (built on top of ChromaDB) and fined-tune models. These artifacts can be consumed by the whylogs-container-python package.
* [app](./app/README.md): the main application that comes with visualization and dashboards. This provides the API endpoint for the container to publish traces to and for the end users to visualize traces at high level.
