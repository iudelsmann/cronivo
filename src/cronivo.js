'use strict';

const _ = require('lodash');
const later = require('later');

let redisClient;
let redisLock;

function setInterval(func, schedule, jobName) {
  // Uses later setInterval method to schedule the job, with some extra instructions to ensure
  // synced execution
  later.setInterval(() => {
    // Locks so other jobs wait before executing
    redisLock(`${jobName}Lock`, (done) => {
      // Gets the job next execution saved on redis
      redisClient.get(jobName, (err, reply) => {
        // If the next execution is null or greater then the current next, then this job must
        // execute, else, it was already executed
        const nextExecution = later.schedule(schedule).next(1);
        // Sets milliseconds to zero since later doesn't use or set it
        nextExecution.setMilliseconds(0);
        if(_.isNil(reply) || reply.toString() < nextExecution) {
          // Sets the next execution time on redis so other jobs wont run
          redisClient.set(jobName, nextExecution.getTime(), () => {
            // Releases the lock since it is no longer required
            done();
            // Calls the method passed by the user
            func();
          });
        } else {
          done();
        }
      });
    });
  }, schedule);
}

function setUp(client) {
  redisClient = client;
  // Uses the provided client to configure redisLock
  redisLock = require('redis-lock')(redisClient);
  // Returns available methods
  return { setInterval };
}


module.exports = setUp;
