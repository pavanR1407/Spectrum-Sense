import React from 'react';
import { cn } from '@/lib/utils';

interface GameButtonProps {
  color: string;
  isFlashing: boolean;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

const GameButton: React.FC<GameButtonProps> = ({
  color,
  isFlashing,
  isActive,
  isDisabled,
  onClick,
}) => {
  return (
    <button
      className={cn(
        'game-button',
        `game-button-${color}`,
        isFlashing && 'flashing',
        isActive && 'active',
        'animate-in'
      )}
      disabled={isDisabled}
      onClick={onClick}
      aria-label={`${color} button`}
      style={{
        animationDelay: `${Math.random() * 0.2}s`,
      }}
    />
  );
};

export default GameButton;
