'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseWordList } = require('../src/parser');
const read = (f) => parseWordList(fs.readFileSync(path.join(__dirname, f), 'utf8'));

const csv = read('samples/sample.csv');
assert.deepStrictEqual(csv, [
  { w: 'apple', m: 'n. 苹果' },
  { w: 'run, ran', m: 'v. 跑，"奔跑"' },
  { w: 'book', m: 'n. 书', p: '/bʊk/', e: 'I read a book.' },
]); // 去 BOM、跳过表头/空行/注释/缺释义行、CSV 引号

assert.deepStrictEqual(read('samples/sample.tsv'), [
  { w: 'cat', m: 'n. 猫', p: '/kæt/' },
  { w: 'dog', m: 'n. 狗', e: 'A dog barks.' },
]);
assert.deepStrictEqual(read('samples/sample.txt'), [{ w: 'sun', m: '太阳' }, { w: 'moon', m: '月亮；月球' }]);

const def = read('../assets/default-words.tsv');
assert.strictEqual(def.length, 52);
assert.ok(def.every((x) => x.w && x.m && x.p && x.e));
console.log('parser tests passed:', csv.length, '+ 2 + 2 sample words,', def.length, 'default words');
