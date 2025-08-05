/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

const xmlCharMap: { [index: string]: string } = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(data: string): string {
  return data.replace(/[<>&'"]/g, char => {
    return xmlCharMap[char];
  });
}
