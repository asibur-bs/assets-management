'use strict';

const PAGE_SIZE = 20;

function queryString(value) {
  if (Array.isArray(value)) return queryString(value[0]);
  if (typeof value !== 'string') return '';
  return value;
}

function parsePage(value) {
  const text = queryString(value).trim();
  if (!/^[1-9]\d*$/.test(text)) return 1;
  const page = Number(text);
  return Number.isSafeInteger(page) ? page : 1;
}

function pageWindow(page, pageCount) {
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, page + 2);
  const pages = [];
  if (start > 1) pages.push(1);
  if (start > 2) pages.push(null);
  for (let number = Math.max(start, 1); number <= end; number += 1) {
    if (!pages.includes(number)) pages.push(number);
  }
  if (end < pageCount - 1) pages.push(null);
  if (end < pageCount) pages.push(pageCount);
  return pages;
}

function paginateRows(rows, requestedPage, hrefFor) {
  const matching = rows.length;
  const pageCount = Math.max(1, Math.ceil(matching / PAGE_SIZE));
  const page = Math.min(parsePage(requestedPage), pageCount);
  const startIndex = (page - 1) * PAGE_SIZE;
  const slice = rows.slice(startIndex, startIndex + PAGE_SIZE);
  const pages = pageWindow(page, pageCount).map((number) =>
    number == null ? { ellipsis: true } : { page: number, href: hrefFor(number), current: number === page }
  );
  return {
    rows: slice,
    matching,
    page,
    pageCount,
    rangeStart: matching === 0 ? 0 : startIndex + 1,
    rangeEnd: matching === 0 ? 0 : startIndex + slice.length,
    prevHref: page > 1 ? hrefFor(page - 1) : null,
    nextHref: page < pageCount ? hrefFor(page + 1) : null,
    pages,
  };
}

module.exports = { PAGE_SIZE, paginateRows };
