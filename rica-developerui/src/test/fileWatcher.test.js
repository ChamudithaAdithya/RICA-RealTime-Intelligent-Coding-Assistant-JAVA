'use strict';

const assert = require('assert');
const Module = require('module');

describe('FileWatcher diagnostics stability', () => {
  it('keeps existing violations visible while a document edit is debounced', () => {
    const originalLoad = Module._load;
    Module._load = function(request, parent, isMain) {
      if (request === 'vscode') return {};
      return originalLoad.call(this, request, parent, isMain);
    };

    let FileWatcher;
    try {
      ({ FileWatcher } = require('../../dist/infrastructure/fileWatcher'));
    } finally {
      Module._load = originalLoad;
    }

    let dirtyCalls = 0;
    const watcher = new FileWatcher(
      {},
      { markFileDirty: () => { dirtyCalls++; } },
      { getWorkspaceRoot: () => 'C:\\workspace' },
      { appendLine: () => {} },
      1000,
    );

    watcher.onDocumentChanged({ uri: { fsPath: 'C:\\workspace\\Example.java' } });
    watcher.dispose();

    assert.strictEqual(dirtyCalls, 0, 'typing must not erase the last valid diagnostics');
  });
});
