/**
 * 词库管理全局状态 Context
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  type WordLibraryData,
  type Category,
  type WordItem,
  loadWordLibrary,
  saveWordLibrary,
  createCategory as createCategoryFn,
  renameCategory as renameCategoryFn,
  deleteCategory as deleteCategoryFn,
  toggleCategoryHidden as toggleCategoryHiddenFn,
  addWord as addWordFn,
  addWords as addWordsFn,
  removeWord as removeWordFn,
  editWord as editWordFn,
  moveWord as moveWordFn,
  setSelectedCategory as setSelectedCategoryFn,
  getWordsForDrawing as getWordsForDrawingFn,
  searchWords as searchWordsFn,
  getStats as getStatsFn,
} from "./word-library";

interface WordLibraryContextValue {
  data: WordLibraryData | null;
  loading: boolean;
  createCategory: (name: string) => void;
  renameCategory: (categoryId: string, newName: string) => void;
  deleteCategory: (categoryId: string) => void;
  toggleCategoryHidden: (categoryId: string) => void;
  addWord: (categoryId: string, text: string) => boolean;
  addWords: (categoryId: string, texts: string[]) => [number, number];
  removeWord: (categoryId: string, wordText: string) => void;
  editWord: (categoryId: string, oldText: string, newText: string) => void;
  moveWord: (fromId: string, toId: string, wordText: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  getWordsForDrawing: () => string[];
  searchWords: (query: string) => { categoryId: string; categoryName: string; word: WordItem }[];
  getStats: () => { totalWords: number; totalCategories: number; systemWords: number; userWords: number };
  getCategory: (id: string) => Category | undefined;
  getVisibleCategories: () => Category[];
}

const WordLibraryContext = createContext<WordLibraryContextValue | null>(null);

export function WordLibraryProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WordLibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef<WordLibraryData | null>(null);

  useEffect(() => {
    loadWordLibrary().then((d) => {
      setData(d);
      dataRef.current = d;
      setLoading(false);
    });
  }, []);

  const updateData = useCallback((newData: WordLibraryData) => {
    setData(newData);
    dataRef.current = newData;
    saveWordLibrary(newData);
  }, []);

  const value: WordLibraryContextValue = {
    data,
    loading,

    createCategory: useCallback((name: string) => {
      if (!dataRef.current) return;
      updateData(createCategoryFn(dataRef.current, name));
    }, [updateData]),

    renameCategory: useCallback((categoryId: string, newName: string) => {
      if (!dataRef.current) return;
      updateData(renameCategoryFn(dataRef.current, categoryId, newName));
    }, [updateData]),

    deleteCategory: useCallback((categoryId: string) => {
      if (!dataRef.current) return;
      updateData(deleteCategoryFn(dataRef.current, categoryId));
    }, [updateData]),

    toggleCategoryHidden: useCallback((categoryId: string) => {
      if (!dataRef.current) return;
      updateData(toggleCategoryHiddenFn(dataRef.current, categoryId));
    }, [updateData]),

    addWord: useCallback((categoryId: string, text: string) => {
      if (!dataRef.current) return false;
      const [newData, ok] = addWordFn(dataRef.current, categoryId, text);
      updateData(newData);
      return ok;
    }, [updateData]),

    addWords: useCallback((categoryId: string, texts: string[]) => {
      if (!dataRef.current) return [0, 0] as [number, number];
      const [newData, added, skipped] = addWordsFn(dataRef.current, categoryId, texts);
      updateData(newData);
      return [added, skipped] as [number, number];
    }, [updateData]),

    removeWord: useCallback((categoryId: string, wordText: string) => {
      if (!dataRef.current) return;
      updateData(removeWordFn(dataRef.current, categoryId, wordText));
    }, [updateData]),

    editWord: useCallback((categoryId: string, oldText: string, newText: string) => {
      if (!dataRef.current) return;
      updateData(editWordFn(dataRef.current, categoryId, oldText, newText));
    }, [updateData]),

    moveWord: useCallback((fromId: string, toId: string, wordText: string) => {
      if (!dataRef.current) return;
      updateData(moveWordFn(dataRef.current, fromId, toId, wordText));
    }, [updateData]),

    setSelectedCategory: useCallback((categoryId: string | null) => {
      if (!dataRef.current) return;
      updateData(setSelectedCategoryFn(dataRef.current, categoryId));
    }, [updateData]),

    getWordsForDrawing: useCallback(() => {
      if (!dataRef.current) return [];
      return getWordsForDrawingFn(dataRef.current, dataRef.current.selectedCategoryId);
    }, []),

    searchWords: useCallback((query: string) => {
      if (!dataRef.current) return [];
      return searchWordsFn(dataRef.current, query);
    }, []),

    getStats: useCallback(() => {
      if (!dataRef.current) return { totalWords: 0, totalCategories: 0, systemWords: 0, userWords: 0 };
      return getStatsFn(dataRef.current);
    }, []),

    getCategory: useCallback((id: string) => {
      if (!dataRef.current) return undefined;
      return dataRef.current.categories.find((c) => c.id === id);
    }, []),

    getVisibleCategories: useCallback(() => {
      if (!dataRef.current) return [];
      return dataRef.current.categories.filter((c) => !c.isHidden);
    }, []),
  };

  return (
    <WordLibraryContext.Provider value={value}>
      {children}
    </WordLibraryContext.Provider>
  );
}

export function useWordLibrary(): WordLibraryContextValue {
  const ctx = useContext(WordLibraryContext);
  if (!ctx) throw new Error("useWordLibrary must be used within WordLibraryProvider");
  return ctx;
}
