/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { stub, restore } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import { Timer } from '../../src/shared/timer';
import moment from 'moment';
import { DEFAULT_NUMERIC_VALUE } from '../../src/shared/constants';

chai.use(sinonChai);

describe('src/scenario/shared/timer', () => {
  afterEach(() => {
    restore();
  });

  it('should returns the description', async () => {
    const testTimer: Timer = new Timer('Test');

    expect(testTimer.getDescription()).to.eql('Test');
  });

  it('should returns 0 when doesn`t have start/stop', async () => {
    const testTimer: Timer = new Timer('Test');
    expect(testTimer.getTime()).to.eql(-1);
  });

  it('should create several timers', async () => {
    const [testTimer1, testTimer2] = Timer.create([
      { label: 'Test1' },
      { label: 'Test2' },
    ]);

    expect(testTimer1.getDescription()).to.eql('Test1');
    expect(testTimer2.getDescription()).to.eql('Test2');
  });

  it('should returns the difference between to times', async () => {
    const testTimer: Timer = new Timer('Test');

    const startTime = moment('2010-01-01 10:30:35', 'YYYY-MM-DD HH:mm:ss');
    let momentStub = stub(moment, 'now').returns(startTime.unix() * 1000);
    testTimer.start();

    momentStub.restore();

    const endTime = moment('2015-02-02 11:40:45', 'YYYY-MM-DD HH:mm:ss');
    momentStub = stub(moment, 'now').returns(endTime.unix() * 1000);
    testTimer.end();

    expect(testTimer.getTime()).to.eql(endTime.diff(startTime));
  });

  it('should returns -1 when reset the timer', async () => {
    const testTimer: Timer = new Timer('Test');
    testTimer.start();
    testTimer.end();
    testTimer.resetTimer();

    expect(testTimer.getTime()).to.eq(-1);
  });

  it('should get/set error field', async () => {
    const testTimer: Timer = new Timer('Test');
    testTimer.error = 'test error';

    expect(testTimer.error).to.eq('test error');
  });

  it('should returns the maximum expected duration -1 if not set in constructor', async () => {
    const testTimer: Timer = new Timer('Test');

    expect(testTimer.targetValue).to.eql(DEFAULT_NUMERIC_VALUE);
  });

  it('should returns the maximum expected duration set in constructor', async () => {
    const testTimer: Timer = new Timer('Test', 1000);

    expect(testTimer.targetValue).to.eql(1000);
  });

  it('should create a timer from a exception', async () => {
    const testTimer: Timer = Timer.createFromException(
      'Test Page Description',
      { message: 'Test message', exception: 'Test exception produced in test' }
    );

    expect(testTimer.error).to.eql(
      'Test exception produced in test. Test message'
    );
    expect(testTimer.getTime()).to.eql(-1);
  });

  it('should create a timer from a message', async () => {
    const testTimer: Timer = Timer.createFromException(
      'Test Page Description',
      { message: 'Test message', exception: undefined }
    );

    expect(testTimer.error).to.eql('Test message');
  });

  it('should return time set from a given value using setTime', async () => {
    const testTimer: Timer = new Timer('Test');
    testTimer.setTime(10);

    expect(testTimer.getTime()).to.be.approximately(10, 1);
  });
});
