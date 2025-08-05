/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from "chai";
import { escapeXml } from "../../src/parser/xml.js";

describe("text/xml", () => {
  it("should replace special xml characters with escape codes", () => {
    expect(
      escapeXml("void fn() { a < b; 2 > 1; x & y; 'str' == \"str\" }")
    ).to.eql(
      "void fn() { a &lt; b; 2 &gt; 1; x &amp; y; &apos;str&apos; == &quot;str&quot; }"
    );
  });
});
