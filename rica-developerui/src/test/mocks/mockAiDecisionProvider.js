'use strict';

const createMockAiDecisionProvider = () => {
  const state = {
    calls: [],
    available: true,
    decisions: [],
    failWith: null,
  };

  const provider = {
    setAvailable: (v) => {
      state.available = v;
      return provider;
    },
    setDecisions: (arr) => {
      state.decisions = arr || [];
      return provider;
    },
    setFailWith: (e) => {
      state.failWith = e;
      return provider;
    },
    isAvailable: async () => state.available,
    evaluate: async (context) => {
      state.calls.push(context);
      if (state.failWith) throw state.failWith;
      return state.decisions;
    },
  };

  return { provider, state };
};

module.exports = { createMockAiDecisionProvider };