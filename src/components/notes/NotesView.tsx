import React from "react";
import { RevisionLibraryView } from "./RevisionLibraryView";

interface NotesViewProps {
  onAskMishraJi?: (prompt: string, subject?: string, noteContext?: any) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ onAskMishraJi }) => {
  return <RevisionLibraryView onAskMishraJi={onAskMishraJi} />;
};
