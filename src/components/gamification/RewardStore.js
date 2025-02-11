import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { habitService } from '../../services/HabitService';
import { rewardsService } from '../../services/RewardsService';
import '../gamification/Gamification.css';

class StoreErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Store Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="store-error">
          <h3>Oops! Something went wrong.</h3>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RewardStore = () => {
  const [userProgress, setUserProgress] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [rewards] = useState([
    {
      id: 'premium_yearly',
      title: 'Premium Yearly Pass',
      description: 'Unlock all premium features and exclusive rewards for 1 year',
      cost: 10000,
      type: 'subscription',
      icon: '👑',
      rarity: 'legendary',
      effects: ['All premium features', 'Exclusive rewards', '2x gem earning', 'Priority support'],
      limited: true,
      discount: '50% off'
    },
    {
      id: 'theme_dark',
      title: 'Dark Theme',
      description: 'A sleek dark theme with custom accent colors',
      cost: 500,
      type: 'theme',
      icon: '🌙',
      rarity: 'common',
      effects: ['Changes app appearance', 'Reduces eye strain']
    },
    {
      id: 'winter_theme_2025',
      title: 'Winter Wonderland 2025',
      description: 'Limited edition winter theme with snow effects',
      cost: 2000,
      type: 'theme',
      icon: '❄️',
      rarity: 'legendary',
      effects: ['Seasonal animations', 'Unique sound effects', 'Special winter badges'],
      limited: true,
      available_until: '2025-02-28'
    },
    {
      id: 'theme_neon',
      title: 'Neon Theme',
      description: 'Vibrant neon aesthetic with glowing elements',
      cost: 1000,
      type: 'theme',
      icon: '🎨',
      rarity: 'rare',
      effects: ['Unique visual style', 'Custom animations']
    },
    {
      id: 'streak_shield_plus',
      title: 'Streak Shield Plus',
      description: 'Enhanced streak protection with 3-day coverage',
      cost: 3000,
      type: 'powerup',
      icon: '🛡️',
      rarity: 'legendary',
      effects: ['3-day streak protection', 'Bonus gems on activation', 'Share with friends']
    },
    {
      id: 'group_boost',
      title: 'Group Boost Bundle',
      description: 'Activate XP boost for your entire friend group',
      cost: 5000,
      type: 'powerup',
      icon: '⚡',
      rarity: 'legendary',
      effects: ['3x XP gain for group', '48-hour duration', 'Bonus gems for group']
    },
    {
      id: 'achievement_master',
      title: 'Achievement Master Bundle',
      description: 'Ultimate badge customization and sharing platform',
      cost: 5000,
      type: 'feature',
      icon: '🏆',
      rarity: 'legendary',
      effects: ['Custom badge creation', 'Badge marketplace', 'Achievement sharing', 'Special profile effects']
    },
    {
      id: 'social_bundle',
      title: 'Social Pro Bundle',
      description: 'Enhanced social features and group capabilities',
      cost: 4000,
      type: 'feature',
      icon: '👥',
      rarity: 'legendary',
      effects: ['Create groups', 'Group challenges', 'Social feed', 'Achievement sharing']
    },
    {
      id: 'analytics_pro',
      title: 'Analytics Pro',
      description: 'Advanced habit tracking and insights',
      cost: 3500,
      type: 'feature',
      icon: '📊',
      rarity: 'epic',
      effects: ['Detailed statistics', 'Progress predictions', 'Custom reports', 'Data export']
    }
  ]);

  useEffect(() => {
    loadUserProgress();
  }, []);

  const loadUserProgress = async () => {
    try {
      setIsLoading(true);
      const progress = await habitService.getUserProgress();
      setUserProgress(progress);
    } catch (error) {
      console.error('Failed to load user progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseReward = useCallback(async (reward) => {
    if (userProgress.coins >= reward.cost) {
      try {
        setPurchaseStatus({ type: 'loading', message: 'Processing purchase...' });
        const result = await rewardsService.purchaseReward(reward.id);
        
        if (result.success) {
          const updatedProgress = {
            ...userProgress,
            coins: userProgress.coins - reward.cost,
            rewards: [...(userProgress.rewards || []), reward.id]
          };
          setUserProgress(updatedProgress);
          await habitService.updateUserProgress(updatedProgress);
          
          setPurchaseStatus({
            type: 'success',
            message: `Successfully purchased ${reward.title}!`
          });

          // Apply immediate effects based on reward type
          if (reward.type === 'theme') {
            rewardsService.applyTheme(reward.id);
          } else if (reward.type === 'powerup') {
            rewardsService.activatePowerup(reward.id);
          }
        }
      } catch (error) {
        setPurchaseStatus({
          type: 'error',
          message: 'Failed to complete purchase. Please try again.'
        });
      }

      // Clear status after 3 seconds
      setTimeout(() => setPurchaseStatus(null), 3000);
    }
  }, [userProgress]);

  const getRarityColor = useCallback((rarity) => {
    switch (rarity) {
      case 'legendary': return 'linear-gradient(135deg, #ffd700, #ff8c00)';
      case 'epic': return 'linear-gradient(135deg, #9400d3, #4b0082)';
      case 'rare': return 'linear-gradient(135deg, #4169e1, #0000ff)';
      default: return 'linear-gradient(135deg, #32cd32, #228b22)';
    }
  }, []);

  const isRewardOwned = useCallback((rewardId) => {
    return userProgress?.rewards?.includes(rewardId);
  }, [userProgress?.rewards]);

  const filteredAndSortedRewards = useMemo(() => {
    return rewards.filter(reward => {
      const matchesFilter = filterType === 'all' || reward.type === filterType;
      const matchesSearch = searchQuery === '' || 
        reward.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reward.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.cost - b.cost;
        case 'price-high':
          return b.cost - a.cost;
        case 'rarity':
          const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        default:
          return 0;
      }
    });
  }, [rewards, filterType, sortBy, searchQuery]);

  const handleKeyPress = useCallback((event, handler) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="store-container loading">
        <div className="loading-spinner">Loading store...</div>
      </div>
    );
  }

  if (!userProgress) {
    return (
      <div className="store-container loading">
        <div className="loading-spinner">Loading store...</div>
      </div>
    );
  }

  return (
    <StoreErrorBoundary>
      <div className="store-container" role="main" aria-label="Reward Store">
        <div className="store-header">
          <div className="store-title-section">
            <h2>Reward Store</h2>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search rewards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Search rewards"
              />
            </div>
            <div className="store-filters">
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
                aria-label="Filter rewards by type"
              >
                <option value="all">All Items</option>
                <option value="subscription">Subscriptions</option>
                <option value="theme">Themes</option>
                <option value="powerup">Power-ups</option>
                <option value="feature">Features</option>
              </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
                aria-label="Sort rewards by"
              >
                <option value="default">Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rarity">Rarity</option>
              </select>
            </div>
          </div>
          <div className="user-balance">
            <span className="gems">💎 {userProgress.coins}</span>
            <span className="level">Level {Math.floor(userProgress.xp / 1000) + 1}</span>
          </div>
        </div>

        <div className="store-grid" role="grid">
          {filteredAndSortedRewards.map((reward) => (
            <div 
              key={reward.id} 
              className={`store-item ${isRewardOwned(reward.id) ? 'owned' : ''} ${
                reward.limited ? 'limited' : ''
              } ${reward.discount ? 'discounted' : ''}`}
              style={{
                '--rarity-gradient': getRarityColor(reward.rarity)
              }}
              role="gridcell"
              tabIndex={0}
              onKeyPress={(e) => !isRewardOwned(reward.id) && handleKeyPress(e, () => purchaseReward(reward))}
            >
              <span className="store-item-icon">{reward.icon}</span>
              <h3>{reward.title}</h3>
              <div className="rarity-badge" style={{ background: getRarityColor(reward.rarity) }}>
                {reward.rarity}
              </div>
              <p>{reward.description}</p>
              <div className="effects-list">
                {reward.effects.map((effect, index) => (
                  <span key={index} className="effect-tag">{effect}</span>
                ))}
              </div>
              <div className="store-item-price">
                {reward.discount ? (
                  <>
                    <span className="original-price">💎 {Math.round(reward.cost * 1.5)}</span>
                    <span className="discount-badge">{reward.discount}</span>
                    <span>💎 {reward.cost}</span>
                  </>
                ) : (
                  <span>💎 {reward.cost}</span>
                )}
              </div>
              {isRewardOwned(reward.id) ? (
                <button className="owned-button" disabled>
                  Owned
                </button>
              ) : (
                <button
                  className="purchase-button"
                  onClick={() => purchaseReward(reward)}
                  disabled={userProgress.coins < reward.cost}
                >
                  {userProgress.coins < reward.cost ? `Need ${reward.cost - userProgress.coins} more gems` : 'Purchase'}
                </button>
              )}
            </div>
          ))}
        </div>

        {purchaseStatus && (
          <div className={`purchase-status ${purchaseStatus.type}`}>
            {purchaseStatus.message}
          </div>
        )}

        <div className="store-info">
          <h3>How to Earn Gems</h3>
          <div className="earning-methods">
            <div className="earning-item">
              <span className="earning-icon">✅</span>
              <span className="earning-desc">Complete daily habits: 10 gems</span>
            </div>
            <div className="earning-item">
              <span className="earning-icon">🔥</span>
              <span className="earning-desc">Maintain streaks: 5 gems per day</span>
            </div>
            <div className="earning-item">
              <span className="earning-icon">⭐</span>
              <span className="earning-desc">Level up: 100 gems</span>
            </div>
            <div className="earning-item">
              <span className="earning-icon">🎯</span>
              <span className="earning-desc">Complete challenges: 50-200 gems</span>
            </div>
            <div className="earning-item">
              <span className="earning-icon">👥</span>
              <span className="earning-desc">Group challenges: 25 gems</span>
            </div>
          </div>
        </div>
      </div>
    </StoreErrorBoundary>
  );
};

export default RewardStore;
