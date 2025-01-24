from setuptools import setup

setup(
    name='whylabs-diagnoser',
    version='0.0.1',
    packages=['smart_config'],
    url='',
    license='Apache-2.0',
    author='Christine Draper',
    author_email='christine@whylabs.ai',
    description='Diagnoser for noisy monitors',
    python_requires='>=3.8, <3.12',
    install_requires=[
        'whylabs-client', 'whylabs-toolkit[diagnoser]>=0.1.0', 'pydantic<2', 'isodate', 'python-dateutil',
        'fastapi', 'uvicorn[standard]', 'requests', 'pandas', 'numpy', 'python-json-logger',
        # constraints needed for deps to resolve in docker build
        'urllib3<2.1,>=2.0.2', 'anyio==3.*', 'h11<0.13', 'numpy<2.0.0', 'pandas<2.2'
    ],
    tests_require=[
        'pytest'
    ]
)