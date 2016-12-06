# Cronivo
[![Build Status](https://travis-ci.org/iudelsmann/cronivo.svg)](https://travis-ci.org/iudelsmann/cronivo)

Synced job scheduler for node using [later](https://bunkat.github.io/later/) and [Redis](http://redis.js.org/).
Used to synchronize scheduled job executions in cluster or multiprocess.

## Installation
Use npm to download and install.
```bash
npm install cronivo --save
```

## Usage
Cronivo is very simple to use, it is complementary to later, requiring later to be used to create schedules, and redis to create clients.

### Scheduling jobs

To create recurring jobs use:

```js
const redis = require('redis');
const Cronivo = require('cronivo');
const later = require('later');

const redisClient = redis.createClient();
const cronivo = new Cronivo(redisClient);

// Create a schedule any way you like using later
const schedule = later.parse.recur().every(5).second();

// Schedule recurring execution
cronivo.addJob(myFunc, schedule, 'job1');

function myFunc() {
    console.log('I was executed only once')
}
```

To create a single execution job, use:

```js
const redis = require('redis');
const Cronivo = require('cronivo');
const later = require('later');

const redisClient = redis.createClient();
const cronivo = new Cronivo(redisClient);

// Create a schedule any way you like using later
const schedule = later.parse.recur().every(5).second();

// Schedule single execution
cronivo.addSingleExecutionJob(myFunc, schedule, 'job1');

function myFunc() {
    console.log('I was executed only once')
}
```

**The job name must be unique, since it will be used as a key in redis. If you are changing a job's schedule you might need to erase it's data from redis to avoid wrong execution**

### Cancelling jobs

To cancel jobs simply use:

```js
cronivo.cancelJob('job1')
```

This will avoid new executions and erase all data that was stored in redis. If the job does not exists, it will not throw an error, nor erase any data from redis

### Forcing execution

You can also execute a job immeditely, which will not affect the scheduled instances:

```js
cronivo.runJob('job1');
```


# License
(The MIT License)

Copyright (c) 2016 Ivo Udelsmann <iudelsmann@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
