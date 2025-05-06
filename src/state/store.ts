/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export class RunStore<I> {
  protected cursor: number = 0;
  protected items: I[] = [];

  addItems(items: I[]) {
    this.items.push(...items);
  }

  getItems(): I[] {
    return [...this.items];
  }

  getItemsFromCursor(): I[] {
    return this.items.slice(this.cursor, this.items.length);
  }

  moveCursor() {
    this.cursor = this.items.length;
  }
}
