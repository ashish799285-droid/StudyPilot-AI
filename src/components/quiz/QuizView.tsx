import React from "react";
import { useQuizSession } from "../../context/QuizSessionContext";
import { GameShowPreparation } from "./GameShowPreparation";
import { GameShowArena } from "./GameShowArena";
import { GameShowResultScreen } from "./GameShowResultScreen";
import { GameShowChallengeSelect } from "./GameShowChallengeSelect";
import { StudyPilotEnvironment } from "../common/StudyPilotEnvironment";

interface QuizViewProps {
  onAskMishraJi?: (prompt: string, subject?: string) => void;
  onAskArlo?: (prompt: string, subject?: string) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ onAskMishraJi, onAskArlo }) => {
  const { activeSession } = useQuizSession();
  const handleAsk = onAskMishraJi || onAskArlo;
  const isQuizActive = activeSession?.status === "active";

  const renderContent = () => {
    if (!activeSession) {
      return <GameShowChallengeSelect />;
    }

    if (activeSession.status === "preparing") {
      return <GameShowPreparation />;
    }

    if (activeSession.status === "active") {
      return <GameShowArena />;
    }

    if (activeSession.status === "terminal") {
      return <GameShowResultScreen onAskMishraJi={handleAsk} />;
    }

    return <GameShowChallengeSelect />;
  };

  return (
    <StudyPilotEnvironment roomType="arena" isQuizActive={isQuizActive}>
      {renderContent()}
    </StudyPilotEnvironment>
  );
};
