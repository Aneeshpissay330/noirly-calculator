import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

interface HistoryState {
  entries: HistoryEntry[];
}

const initialState: HistoryState = {
  entries: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addEntry(state, action: PayloadAction<Omit<HistoryEntry, 'id' | 'timestamp'>>) {
      state.entries.unshift({
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      });
    },
    removeEntry(state, action: PayloadAction<string>) {
      state.entries = state.entries.filter(e => e.id !== action.payload);
    },
    clearHistory(state) {
      state.entries = [];
    },
  },
});

export const { addEntry, removeEntry, clearHistory } = historySlice.actions;
export default historySlice.reducer;
