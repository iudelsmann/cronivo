'use strict';

const _ = require('lodash');
const later = require('later');

/**
 * Executes the action for either setInterval or setTimeout, using lock and redis to synchronize
 * execution.
 *
 * @param  {Function}       action   The function to be executed on the provided schedule
 * @param  {schedule}       schedule A later schedule for the action
 * @param  {string}         jobName  The name of the job to be executed
 * @private
 */
function executeAction(action, schedule, jobName) {
  // Locks so other jobs wait before executing
  this.redisLock(`${jobName}Lock`, (done) => {
    // Gets the job next execution saved on redis
    this.redisClient.get(jobName, (err, reply) => {
      // If the next execution (saved on redis) is null or greater than now, then this job must
      // execute, else, it was already executed
      const nextExecutions = later.schedule(schedule).next(2);

      // Sets milliseconds to zero since later doesn't use or set it
      _.forEach(nextExecutions, execution => execution.setMilliseconds(0));

      const now = new Date().getTime();

      const nextExecution = now > nextExecutions[0].getTime()
        ? nextExecutions[1] : nextExecutions[0];

      if (_.isNil(reply) || reply.toString() < now) {
        // Sets the next execution time on redis so other jobs wont run
        this.redisClient.set(jobName, nextExecution.getTime(), () => {
          // Releases the lock since it is no longer required
          done();
          // Calls the method passed by the user
          action();
        });
      } else {
        done();
      }
    });
  });
}

/**
 * Class to schedule synchronized jobs.
 */
class Cronivo {
  /**
   * Sets up the class, saving the redis client and using it to startup redisLock.
   *
   * @param {RedisClient} client A redis client connected to a redis instance where the jobs data
   *                             will be saved
   */
  constructor(client) {
    this.redisClient = client;
    // Uses the provided client to configure redisLock
    this.redisLock = require('redis-lock')(this.redisClient);  // eslint-disable-line global-require
    // Initialize jobs list
    this.jobs = {};
  }

  /**
   * Executes the provided function repeatedely in the provided schedule. Uses the job name as a key
   * on redis, therefore it must be unique.
   *
   * @param  {Function}       action   The function to be executed on the provided schedule
   * @param  {schedule}       schedule A later schedule for the action
   * @param  {string}         jobName  The name of the job to be executed
   */
  addJob(action, schedule, jobName) {
    this.jobs[jobName] = later.setInterval(() => {
      executeAction.bind(this)(action, schedule, jobName);
    }, schedule);
  }

  /**
   * Executes the provided function once in the provided schedule. Uses the job name as a key on
   * redis, therefore it must be unique.
   *
   * @param  {Function}       action   The function to be executed on the provided schedule
   * @param  {schedule}       schedule A later schedule for the action
   * @param  {string}         jobName  The name of the job to be executed
   */
  addSingleJob(action, schedule, jobName) {
    this.jobs[jobName] = later.setTimeout(() => {
      executeAction.bind(this)(action, schedule, jobName);
    }, schedule);
  }

  /**
   * Cancels a jobs execution, clearing all data about it.
   *
   * @param  {string} jobName The name of the job to be cancelled.
   */
  cancelJob(jobName) {
    if (this.jobs[jobName]) {
      this.jobs[jobName].clear();
      delete this.jobs[jobName];
      this.redisLock(`${jobName}Lock`, (done) => {
        this.redisClient.del(jobName, () => done());
      });
    }
  }
}


module.exports = Cronivo;
