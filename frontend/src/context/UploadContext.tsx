/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import { useUpload } from '../hooks/useUpload';

type UploadContextValue = ReturnType<typeof useUpload>;

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const value = useUpload();
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploadContext(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUploadContext must be used inside UploadProvider');
  return ctx;
}
