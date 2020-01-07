# Einstein Shell Tutorial

Einstein provides an interactive shell for trying out concepts in a self-contained, simulated cloud environement that runs on the local machine. This tutorial introduces the `Shell` and then walks through the process of

* Deploying the `Einstein Service`
* Uploading a `Benchmark`
* Uploading a `Suite`
* Uploading a `Candidate`
* Running a `Suite` for a `Benchmark` on a specified `Candidate`
* Examining the results of the `Run`

Our first step is to get a copy of `Einstein`. Currently the only way to install `Einstein` is to build it from source code.

## Building Einstein
`Einstein` is a [Node.js](https://nodejs.org/en/) project,
written in [TypeScript](https://www.typescriptlang.org/).
In order to use `Einstein` you must have
[Node](https://nodejs.org/en/download/) installed on your machine.
`Einstein` has been tested with Node version 10.15.3.

Here are the steps for cloning and building `Einstein`:
~~~
% git clone git@github.com:MikeHopcroft/Einstein.git
% npm run install
% npm run compile
~~~

Now that we've built `Einstein`, let's fire up the `Shell`.

## Introducing the Shell

The `Shell` starts up a simulated cloud environment with blob storage, attached volumes, a container registry, and an orchestrator. By default, the blob storage and disk volumes reside in RAM and are initialized fresh for each session. You can use the `--localStorge` and `--cloudStorage` flags to map these stores to folders on your machine. Use this option when you want files to persist across sessions.

Here's how start a session with ephermeral, in-memory stores:
~~~
% node build/applications/shell.js
~~~

Here's an example of a session with backed by folders:
~~~
% node build/applications/shell.js --localStorage=~/temp/local --cloudStorage=~/temp/cloud
~~~

When the shell starts up, it prints a welcome message. Typing `"help"` at this point will list a available commands:

[//]: # (shell)
~~~
Welcome to the Einstein interactive command shell.
Type commands below.
A blank line exits.

Type "help" for information on commands.

einstein:/% help
~~~

### Shell Commands

Here's a cheat sheet for the shell commands:

* Local storage
    * ls \<path> - show pre-populated configuration files
    * cd \<path>
    * pushd \<path>
    * popd \<path>
    * pwd
    * more \<path>
* Cloud storage
    * cloud ls \<path>
    * cloud cd \<path>
    * cloud pwd
    * cloud more \<path>
* Orchestration
    * images - lists the images in the container registry
    * services - lists the services currently running in the cluster
* Einstein CLI
    * einstein help
    * einstein deploy
    * einstein encrypt \<file>
    * einstein benchmark \<benchmark description file>
    * einstein suite \<suite description file>
    * einstein candidate \<candidate description file>
    * einstein run \<candidate id> \<suite id>
    * einstein list \<benchmark|candidate|run|suite> \<pattern>
    * einstein show \<benchmark|candidate|run|suite> \<id>

## Deploying Einstein

* Einstein service is a container
* containers
* Generate public and private keys

Initially there are no services running in our cluster.

[//]: # (shell)
~~~
einstein:/% services
no services running
~~~

Deploy Einstein immediately check services. Nothing running yet.

[//]: # (shell)
~~~
einstein:/% services
no services running
einstein:/% einstein deploy lab
Deploying to lab.
einstein:/% services
no services running
~~~

Wait a few seconds and check services again. Can see that the host lab is running the Einstein service on port 8080.

[//]: # (shell)
~~~
einstein:/% # wait 10 seconds for service to start ...
einstein:/% services
lab:8080
~~~

## Submitting a Benchmark

* Description of contest
* Benchmark description file
* containers
* einstein benchmark
* einstein list benchmarks

Shell pre-provisions the container registry.

[//]: # (shell)
~~~
einstein:/% images
~~~


## Submitting a Suite

* Suite description file
* Domain data
* einstein suite
* einstein list suites

## Submitting a Candidate

* Candidate description file
* einstein candidate
* einstein list candidates

## Running a Suite

* einstein run
* einstein list runs
* einstein show run



The end.