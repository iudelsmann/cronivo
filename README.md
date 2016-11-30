# Cronivo
Synced job scheduler for node using [later](https://bunkat.github.io/later/) and [Redis](http://redis.js.org/).
Used to synchronize scheduled job executions in cluster or multiprocess.

## Installation
Use npm to download and install.
```bash
npm install cronivo
```

## Usage
Cronivo is very simple to use, it is complementary to later, requiring later to be used to create schedules, and redis to create clients.

```js
const redisCient = require('redis').createClient();
const cronivo = require('cronivo')(redisClient);
const later = require('later');

// Create a schedule any way you like using later
const schedule = later.parse.recur().every(5).second();

// Schedule execution, use a unique job name for each job
cronivo.setInterval(myFunc, schedule, 'job1');

function myFunc() {
    console.log('I was executed only once')
}
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