'use strict';

const _ = require('lodash');
const later = require('later');

let redisLock;

function setInterval(func, schedule, jobName) {
  // Uses later setInterval method to schedule the job, with some extra instructions to ensure
  // synced execution
  later.setInterval(() => {
    // Locks so other jobs wait before executing
    redisLock(`${jobName}Lock`, (done) => {
      // Gets the job next execution saved on redis
      redisClient.get(jobName, (err, reply) => {
        // If the next execution is null or different from the current next, then this job must
        // execute, else, it was already executed
        const nextExecution = moment(schedule.next(1)[0]).valueOf();
        if(_.isNil(reply) || reply.toString() !== nextExecution) {
          // Sets the next execution time on redis so other jobs wont run
          redisClient.set(jobName, nextExecution, () => {
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

function setUp(redisClient) {
  // Uses the provided client to configure redisLock
  redisLock = require('redisLock')(redisClient);
  // Returns available methods
  return { setInterval };
}


module.exports = setUp;
