import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import GameButton from './GameButton';

// All available colors in order of unlock
const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink', 'lime'];

// Determine how many colors are available at each level
const getColorsForLevel = (level: number): string[] => {
  // Start with 4 colors, add a new one every 3 levels
  const colorCount = Math.min(4 + Math.floor((level - 1) / 3), ALL_COLORS.length);
  return ALL_COLORS.slice(0, colorCount);
};

// Get grid columns based on color count
const getGridCols = (colorCount: number): string => {
  if (colorCount <= 4) return 'grid-cols-2';
  if (colorCount <= 6) return 'grid-cols-3';
  return 'grid-cols-3';
};

type GameState = 'idle' | 'showing' | 'playing' | 'success' | 'gameover';

const SimonGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [flashingColor, setFlashingColor] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('simonHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [shake, setShake] = useState(false);

  const {
    initAudio,
    playColorTone,
    playSuccessSound,
    playErrorSound,
    playLevelComplete,
    startBackgroundMusic,
    stopBackgroundMusic,
    getRandomSuccessPhrase,
  } = useAudioEngine();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const availableColors = getColorsForLevel(level);

  // Generate next color in sequence
  const generateNextColor = useCallback(() => {
    const colors = getColorsForLevel(level);
    return colors[Math.floor(Math.random() * colors.length)];
  }, [level]);

  // Clear repeat timeout helper
  const clearRepeatTimeout = useCallback(() => {
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
  }, []);

  // Start repeat timeout (10 seconds)
  const startRepeatTimeout = useCallback((seq: string[]) => {
    clearRepeatTimeout();
    repeatTimeoutRef.current = setTimeout(() => {
      if (gameState === 'playing') {
        showSequence(seq);
      }
    }, 10000);
  }, [clearRepeatTimeout, gameState]);

  // Show the sequence to the player
  const showSequence = useCallback(async (seq: string[]) => {
    clearRepeatTimeout();
    setGameState('showing');
    setMessage('Watch carefully...');
    setMessageType('info');

    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const color = seq[i];
      setFlashingColor(color);
      playColorTone(color, 400);
      await new Promise(resolve => setTimeout(resolve, 400));
      setFlashingColor(null);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    setGameState('playing');
    setMessage('Your turn!....');
    setPlayerIndex(0);
    
    // Start 10 second timeout to repeat sequence
    startRepeatTimeout(seq);
  }, [playColorTone, clearRepeatTimeout, startRepeatTimeout]);

  // Start a new game
  const startGame = useCallback(() => {
    initAudio();
    startBackgroundMusic();
    setLevel(1);
    setPlayerIndex(0);
    setMessage('');

    const firstColor = ALL_COLORS[Math.floor(Math.random() * 4)];
    const newSequence = [firstColor];
    setSequence(newSequence);
    
    setTimeout(() => showSequence(newSequence), 500);
  }, [initAudio, startBackgroundMusic, showSequence]);

  // Handle player input
  const handleColorClick = useCallback((color: string) => {
    if (gameState !== 'playing') return;

    // Reset repeat timeout on each correct input
    clearRepeatTimeout();

    setActiveColor(color);
    playColorTone(color, 200);
    setTimeout(() => setActiveColor(null), 200);

    // Check if correct
    if (color === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      
      if (nextIndex === sequence.length) {
        // Level complete!
        playSuccessSound();
        const phrase = getRandomSuccessPhrase();
        setMessage(phrase);
        setMessageType('success');
        
        if (level >= 25) {
          // Game won!
          setGameState('success');
          setMessage('🎉 YOU WON! Amazing memory!');
          stopBackgroundMusic();
          playLevelComplete();
          if (level > highScore) {
            setHighScore(level);
            localStorage.setItem('simonHighScore', String(level));
          }
        } else {
          // Next level
          const nextLevel = level + 1;
          setLevel(nextLevel);
          
          // Add next color to sequence
          const nextColors = getColorsForLevel(nextLevel);
          const newColor = nextColors[Math.floor(Math.random() * nextColors.length)];
          const newSequence = [...sequence, newColor];
          setSequence(newSequence);
          
          setTimeout(() => showSequence(newSequence), 1500);
        }
      } else {
        setPlayerIndex(nextIndex);
        // Restart repeat timeout for remaining inputs
        startRepeatTimeout(sequence);
      }
    } else {
      // Wrong color - game over
      playErrorSound();
      setGameState('gameover');
      setMessage('Game Over! Try again?');
      setMessageType('error');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      stopBackgroundMusic();
      
      if (level > highScore) {
        setHighScore(level);
        localStorage.setItem('simonHighScore', String(level));
      }
    }
  }, [
    gameState,
    sequence,
    playerIndex,
    level,
    highScore,
    playColorTone,
    playSuccessSound,
    playErrorSound,
    playLevelComplete,
    getRandomSuccessPhrase,
    showSequence,
    stopBackgroundMusic,
    clearRepeatTimeout,
    startRepeatTimeout,
  ]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="game-container">
      <div className="flex flex-col items-center gap-6 md:gap-8 max-w-lg mx-auto">
        {/* Title */}
        <h1 className="game-title">
          Spectrum Sense 
        </h1>
        <h1 >Color Sequence Memory Game</h1>

        {/* Stats */}
        <div className="flex gap-4 md:gap-8">
          <div className="stats-card text-center">
            <p className="text-muted-foreground text-sm font-body uppercase tracking-wider">Level</p>
            <p className="level-display">{level}</p>
          </div>
          <div className="stats-card text-center">
            <p className="text-muted-foreground text-sm font-body uppercase tracking-wider">Best</p>
            <p className="level-display">{highScore}</p>
          </div>
        </div>

        {/* Start Button - shown before game starts, closer to stats */}
        {gameState === 'idle' && (
          <button
            className="start-button mt-4"
            onClick={startGame}
          >
            Start Game
          </button>
        )}

        {/* Message */}
        {gameState !== 'idle' && (
          <div 
            className={cn(
              'message-display',
              messageType === 'success' && 'message-success',
              messageType === 'error' && 'message-error',
              messageType === 'info' && 'message-info'
            )}
          >
            {message}
          </div>
        )}

        {/* Game Grid - only shown after game starts */}
        {gameState !== 'idle' && (
          <div 
            className={cn(
              'game-grid',
              getGridCols(availableColors.length),
              shake && 'shake'
            )}
          >
            {availableColors.map((color) => (
              <GameButton
                key={color}
                color={color}
                isFlashing={flashingColor === color}
                isActive={activeColor === color}
                isDisabled={gameState !== 'playing'}
                onClick={() => handleColorClick(color)}
              />
            ))}
          </div>
        )}

        {/* Play Again Button - shown after game over or success */}
        {(gameState === 'gameover' || gameState === 'success') && (
          <button
            className="start-button"
            onClick={startGame}
          >
            Play Again
          </button>
        )}

        {/* Instructions */}
        {gameState === 'idle' && (
          <div className="text-center text-muted-foreground max-w-sm">
            <p className="text-sm md:text-base font-body">
              Watch the color sequence, then repeat it!
              <br />
              New colors unlock as you progress.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimonGame;
