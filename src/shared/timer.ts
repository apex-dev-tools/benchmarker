/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import moment from 'moment';
import { TestPerformanceErrorI } from './uiHelper';
import { DEFAULT_NUMERIC_VALUE } from './constants';

/**
 * @deprecated This API will be removed in a future version.
 *
 * The Timer for measure the time in the performance tests
 */
export class Timer {
  /**
   * Creates an array of timers given a name for the timer
   * @param label name to identify the timer
   * @param [targetValue] optional maximum allowed value for a measure
   */
  public static create(
    timerDefinitions: Array<{ label: string; targetValue?: number }>
  ): Timer[] {
    const timers = timerDefinitions.map(
      element => new Timer(element.label, element.targetValue)
    );
    return timers;
  }

  /**
   * Creates a timer with an error associated to it
   * @param description name to identify the timer
   * @param e error message
   */
  public static createFromException(
    description: string,
    e: TestPerformanceErrorI
  ): Timer {
    const timer = new Timer(description);
    timer.error = e.exception ? e.exception + '. ' + e.message : e.message;
    return timer;
  }

  private description: string;
  private _start: moment.Moment | null;
  private _end: moment.Moment | null;
  private _error: string;
  private _targetValue: number;

  /**
   * Construcs a timer given a description
   * @param description name to identify the timer
   * @param [targetValue] optional maximum allowed value for a measure
   */
  public constructor(description: string, targetValue?: number) {
    this.description = description;
    this._start = null;
    this._end = null;
    this._error = '';
    this._targetValue = targetValue || DEFAULT_NUMERIC_VALUE;
  }

  /**
   * Start measuring the time
   */
  public start(): void {
    this._start = moment();
  }

  /**
   * Stop measuring the time
   */
  public end(): void {
    this._end = moment();
  }

  /**
   * Gets time elapsed between start and end of the timer
   */
  public getTime(): number {
    if (this._start && this._end) {
      return this._end.diff(this._start);
    }
    return -1;
  }

  /**
   * Set the timer value
   * @param totalMS number of miliseconds to be set in the timer
   */
  public setTime(totalMS: number): void {
    this._start = moment();
    this._end = moment().add(totalMS, 'milliseconds');
  }

  /**
   * Gets timer description
   */
  public getDescription() {
    return this.description;
  }

  /**
   * Reset timer to its default start and end values
   */
  public resetTimer() {
    this._start = null;
    this._end = null;
  }

  /**
   * Sets timer error
   */
  set error(error: string) {
    this._error = error;
  }

  /**
   * Gets timer error
   */
  get error() {
    return this._error;
  }

  /**
   * Gets timer target value
   */
  get targetValue() {
    return this._targetValue;
  }
}
