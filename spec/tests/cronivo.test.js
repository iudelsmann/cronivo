'use strict';

const proxyquire = require('proxyquire').noCallThru();
const later = require('later');

describe('cronivo:', () => {
  const redisClient = {};

  let Cronivo;
  let cronivo;
  let redisLock;
  let redisLockMethod;
  let freeLock;
  let logger;

  const basetime = new Date('2000-01-01 00:00:00');

  beforeEach(() => {
    freeLock = jasmine.createSpy('freeLock');
    redisLockMethod = jasmine.createSpy('redisLockMethod').and.callFake((lockName, cb) => cb(freeLock));
    redisLock = jasmine.createSpy('redisLock').and.returnValue(redisLockMethod);

    redisClient.set = jasmine.createSpy('set').and.callFake((jobName, value, cb) => cb());
    redisClient.del = jasmine.createSpy('del').and.callFake((jobName, cb) => cb());

    spyOn(later, 'setInterval').and.callFake((func) => { func(); return 'Mock'; });
    spyOn(later, 'setTimeout').and.callFake((func) => { func(); return 'Mock'; });

    logger = {
      error: jasmine.createSpy('error'),
    };

    Cronivo = proxyquire('../../src/cronivo', {
      'redis-lock': redisLock,
      winston: logger,
      later,
    });

    cronivo = new Cronivo(redisClient);

    jasmine.clock().install();
    jasmine.clock().mockDate(basetime);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('constructor:', () => {
    it('should initialize redisLock redisClient and the jobs list', () => {
      const argument = 'redisClient';
      const instance = new Cronivo(argument);
      expect(redisLock).toHaveBeenCalledWith(argument);
      expect(instance.redisLock).toBeDefined();
      expect(instance.redisClient).toBeDefined();
      expect(instance.jobs).toBeDefined();
    });
  });

  describe('addJob:', () => {
    let schedule;
    let action;

    beforeEach(() => {
      schedule = later.parse.recur().every(5).second();
      action = jasmine.createSpy('action');
    });

    it('should call the function if no value was on the database', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, null));

      const jobName = 'jobName';
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 5000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
    });

    it('should call the function if the database value was earlier than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() - 4000));

      const jobName = 'jobName';
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 5000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
    });

    it('should not call the function if the database value is greater than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() + 1000));

      const jobName = 'jobName';
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).not.toHaveBeenCalled();
      expect(freeLock).toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
    });

    it('should catch errors and log them', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, null));

      const jobName = 'jobName';
      const error = new Error('MockError');
      action = jasmine.createSpy('action').and.callFake(() => { throw error; });
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 5000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
      expect(logger.error).toHaveBeenCalledWith(error);
    });

    it('should save the correct next execution if the job was late', () => {
      const lateDate = new Date(basetime.getTime());
      lateDate.setSeconds(2);
      jasmine.clock().mockDate(lateDate);

      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, null));

      const jobName = 'jobName';
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 5000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
    });
  });

  describe('addSingleExecutionJob:', () => {
    let schedule;
    let action;

    beforeEach(() => {
      schedule = later.parse.recur().every(5).second();
      action = jasmine.createSpy('action');
    });

    it('should call the function if no value was on the database', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, null));

      const jobName = 'jobName';
      cronivo.addSingleExecutionJob(action, schedule, jobName);

      expect(later.setTimeout).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 5000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
    });

    it('should call the function if the database value was earlier than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() - 4000));

      const jobName = 'jobName';
      cronivo.addSingleExecutionJob(action, schedule, jobName);

      expect(later.setTimeout).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 5000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
    });

    it('should not call the function if the database value is greater than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() + 1000));

      const jobName = 'jobName';
      cronivo.addSingleExecutionJob(action, schedule, jobName);

      expect(later.setTimeout).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).not.toHaveBeenCalled();
      expect(freeLock).toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(cronivo.jobs[jobName].timer).toBeDefined();
      expect(cronivo.jobs[jobName].action).toBeDefined();
    });
  });

  describe('cancelJob:', () => {
    it('should erase job from jobs list and redis', () => {
      const jobName = 'jobName';
      const mockJob = {
        timer: {
          clear: jasmine.createSpy('clear'),
        },
      };
      cronivo.jobs[jobName] = mockJob;
      cronivo.cancelJob(jobName);
      expect(mockJob.timer.clear).toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).not.toBeDefined();
      expect(redisClient.del).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
    });

    it('should not throw error for unexistent jobs', () => {
      const jobName = 'jobName';
      cronivo.cancelJob(jobName);
      expect(redisClient.del).not.toHaveBeenCalled();
      expect(redisLockMethod).not.toHaveBeenCalled();
      expect(freeLock).not.toHaveBeenCalled();
    });
  });

  describe('runJob:', () => {
    it('should execute the jobs action', () => {
      const jobName = 'jobName';
      const mockJob = {
        action: jasmine.createSpy('action'),
      };
      cronivo.jobs[jobName] = mockJob;
      cronivo.runJob(jobName);
      expect(mockJob.action).toHaveBeenCalled();
    });

    it('should not throw error for unexistent jobs', () => {
      cronivo.runJob('jobName');
    });
  });
});
