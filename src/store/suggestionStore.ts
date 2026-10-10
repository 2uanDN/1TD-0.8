import { create } from 'zustand';
import { scoreSuggestions, TOP_SUGGESTIONS_COUNT } from '../lib/suggestions';
import { Action, Event, SuggestionWeights } from '../types';

export { TOP_SUGGESTIONS_COUNT };

export interface SuggestionStore {
  suggestions: Action[];
  isComputing: boolean;
  computeSuggestions(
    actions: Action[],
    recentEvents: Event[],
    weights: SuggestionWeights,
    now: Date
  ): void;
}

export const useSuggestionStore = create<SuggestionStore>((set) => ({
  suggestions: [],
  isComputing: false,
  computeSuggestions: (actions, recentEvents, weights, now) => {
    set({ isComputing: true });
    const scored = scoreSuggestions(
      actions,
      recentEvents,
      weights,
      now,
      TOP_SUGGESTIONS_COUNT
    );
    set({ suggestions: scored, isComputing: false });
  },
}));
