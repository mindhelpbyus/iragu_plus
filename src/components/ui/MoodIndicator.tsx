// Moods from community-app: Great, Good, Okay, Low, Hard
const MOOD_COLORS: Record<string, string> = {
  Great: 'bg-[#2A8B5B]',
  Good: 'bg-[#96C7AD]',
  Okay: 'bg-[#E3A063]',
  Low: 'bg-[#D96C6C]',
  Hard: 'bg-[#C24141]',
};

const MOOD_VALUES: Record<string, number> = {
  Great: 10,
  Good: 8,
  Okay: 6,
  Low: 4,
  Hard: 2,
};

export function analyzeMood(moods: { mood: string }[]): string | null {
  if (!moods || moods.length === 0) return null;
  const validMoods = moods.map(m => MOOD_VALUES[m.mood]).filter(v => v !== undefined);
  if (validMoods.length === 0) return null;
  
  const sum = validMoods.reduce((acc, val) => acc + val, 0);
  const avg = sum / validMoods.length;
  return avg.toFixed(1);
}

export interface MoodIndicatorProps {
  moods?: { mood: string; createdAt: string }[];
  className?: string;
  showScore?: boolean;
}

export function MoodIndicator({ moods = [], className = '', showScore = false }: MoodIndicatorProps) {
  const bars = Array.from({ length: 10 });
  
  // Sort oldest to newest for left-to-right display, take up to 10
  const displayMoods = [...moods]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-10);

  const score = showScore ? analyzeMood(displayMoods) : null;

  return (
    <div className={`flex items-center gap-[3px] ${className}`}>
      {bars.map((_, i) => {
        const moodObj = displayMoods[i];
        let bgColor = 'bg-[#E8E6E1]'; // empty/neutral
        if (moodObj) {
           bgColor = MOOD_COLORS[moodObj.mood] || 'bg-[#E8E6E1]';
        }
        return (
          <div 
            key={i} 
            className={`h-[14px] w-[5px] rounded-[1px] ${bgColor}`} 
            title={moodObj ? `${moodObj.mood} on ${new Date(moodObj.createdAt).toLocaleDateString()}` : 'No data'} 
          />
        );
      })}
      {score && (
        <span className="ml-2 text-[13px] font-medium text-ink">
          {score} / 10
        </span>
      )}
    </div>
  );
}
