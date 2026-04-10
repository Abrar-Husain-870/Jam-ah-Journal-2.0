import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  Target,
  Settings,
  Home,
  Building,
  Clock,
  X,
  Award,
  TrendingUp,
  Calendar,
  Users,
  Eye,
  ChevronDown,
  ChevronRight,
  Info,
  Star,
  Zap
} from 'lucide-react';

const Rules = () => {
  const [expandedSection, setExpandedSection] = useState('scoring');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionCard = ({ id, title, icon: Icon, children, isExpanded }) => {
    const panelId = `rules-section-${id}-panel`;
    const headingId = `rules-section-${id}-heading`;
    return (
    <div className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 ring-1 ring-black/[0.045] dark:ring-white/[0.08] shadow-jj-card dark:shadow-jj-card-dark overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="w-full px-4 sm:px-6 py-4 bg-jj-mist/40 dark:bg-white/[0.03] hover:bg-jj-mist/65 dark:hover:bg-white/[0.05] transition-colors duration-jj flex items-center justify-between text-left gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-jj-accent dark:text-teal-300 shrink-0" strokeWidth={1.75} />
          <h2 id={headingId} className="text-base sm:text-lg font-semibold tracking-tight text-jj-ink dark:text-stone-100 truncate">
            {title}
          </h2>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-jj-muted dark:text-stone-500 shrink-0" strokeWidth={2} aria-hidden />
        ) : (
          <ChevronRight className="w-5 h-5 text-jj-muted dark:text-stone-500 shrink-0" strokeWidth={2} aria-hidden />
        )}
      </button>
      {isExpanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          className="px-4 sm:px-6 pb-6 sm:pb-7 pt-1 border-t border-black/[0.04] dark:border-white/[0.06] space-y-6"
        >
          {children}
        </div>
      )}
    </div>
    );
  };

  const FormulaBox = ({ title, formula, example }) => (
    <div className="rounded-jj-lg p-4 sm:p-5 bg-jj-mist/35 dark:bg-white/[0.03] ring-1 ring-black/[0.05] dark:ring-white/[0.07]">
      <h4 className="font-semibold text-jj-ink dark:text-stone-100 mb-2">{title}</h4>
      <div className="rounded-jj bg-jj-surface dark:bg-jj-elevated-dark px-3 py-3 mb-3 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <code className="text-jj-accent dark:text-teal-200 font-mono text-xs sm:text-sm leading-relaxed block">
          {formula}
        </code>
      </div>
      {example && (
        <div className="text-sm text-jj-muted dark:text-stone-400">
          <span className="font-medium text-jj-ink/80 dark:text-stone-300">Example:</span> {example}
        </div>
      )}
    </div>
  );

  const ScoreCard = ({ status, standardScore, masjidScore, icon: Icon, description }) => (
    <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark ring-1 ring-black/[0.02] dark:ring-white/[0.04] transition-[ring-color] hover:ring-black/[0.06] dark:hover:ring-white/[0.08]">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-jj-accent dark:text-teal-300" strokeWidth={1.75} />
        <h4 className="font-semibold text-jj-ink dark:text-stone-100">{status}</h4>
      </div>
      <p className="text-sm text-jj-muted dark:text-stone-400 mb-3 leading-relaxed">{description}</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-jj bg-jj-mist/50 dark:bg-white/[0.04] px-2.5 py-2">
          <div className="text-2xs font-semibold uppercase tracking-cap-wide text-jj-muted dark:text-stone-500">
            Standard
          </div>
          <div className="text-base font-semibold tabular-nums text-jj-ink dark:text-stone-100 mt-0.5">
            {standardScore} pts
          </div>
        </div>
        <div className="rounded-jj bg-teal-50/50 dark:bg-teal-950/20 px-2.5 py-2 ring-1 ring-teal-900/8 dark:ring-teal-700/20">
          <div className="text-2xs font-semibold uppercase tracking-cap-wide text-jj-accent dark:text-teal-400/90">
            Home mode
          </div>
          <div className="text-base font-semibold tabular-nums text-jj-ink dark:text-stone-100 mt-0.5">
            {masjidScore} pts
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 ring-1 ring-black/[0.045] dark:ring-white/[0.08] shadow-jj dark:shadow-jj-dark px-5 sm:px-8 py-7 sm:py-9 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-jj-lg bg-teal-50 dark:bg-teal-950/35 ring-1 ring-teal-900/10 dark:ring-teal-700/25 mb-4">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-jj-accent dark:text-teal-300" strokeWidth={1.75} />
          </div>
          <p className="jj-eyebrow">Guide</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-jj-ink dark:text-stone-50 mt-2 text-balance">
            Rules &amp; reference
          </h1>
          <p className="text-sm sm:text-[0.9375rem] text-jj-muted dark:text-stone-400 mt-3 max-w-lg mx-auto leading-relaxed text-pretty">
            How Jamā&apos;ah Journal scores days, metrics, and settings—plain language, same logic the app uses.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-7 mt-6 sm:mt-8">
          {/* Prayer Scoring System */}
          <SectionCard
            id="scoring"
            title="Prayer Scoring System"
            icon={Calculator}
            isExpanded={expandedSection === 'scoring'}
          >
            <div className="space-y-4">
              <p className="text-jj-ink/90 dark:text-stone-300">
                Jamā&apos;ah Journal uses a point-based system to track your prayer consistency. 
                The scoring varies based on your <strong>Prayer Mode</strong> setting.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScoreCard
                  status="Not Prayed"
                  standardScore="0"
                  masjidScore="0"
                  icon={X}
                  description="Prayer was missed completely"
                />
                <ScoreCard
                  status="Qaza (Late)"
                  standardScore="0.5"
                  masjidScore="13"
                  icon={Clock}
                  description="Prayer performed after its time"
                />
                <ScoreCard
                  status="Home"
                  standardScore="1"
                  masjidScore="27"
                  icon={Home}
                  description="Prayer performed at home on time"
                />
                <ScoreCard
                  status="Masjid"
                  standardScore="27"
                  masjidScore="N/A"
                  icon={Building}
                  description="Prayer performed in congregation at mosque"
                />
              </div>

              <div className="rounded-jj-lg p-4 sm:p-5 border border-jj-border/80 dark:border-white/[0.08] bg-teal-50/35 dark:bg-white/[0.03]">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-jj-accent dark:text-teal-300 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-jj-ink dark:text-stone-100 mb-1">Why Different Scoring?</h4>
                    <p className="text-jj-muted dark:text-stone-400 text-sm">
                      <strong>Standard Mode:</strong> Rewards mosque attendance with higher points (27 vs 1 for home).<br/>
                      <strong>Home Mode:</strong> Treats all on-time prayers equally (27 pts), perfect for those who primarily pray at home.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Metrics Explained */}
          <SectionCard
            id="metrics"
            title="Metrics & Formulas"
            icon={Target}
            isExpanded={expandedSection === 'metrics'}
          >
            <div className="space-y-6">
              <FormulaBox
                title="Average Score"
                formula="Total Score ÷ Days Actually Tracked"
                example="If you scored 135 points over 1 day tracked = 135.00 average"
              />
              
              <FormulaBox
                title="Consistency Percentage"
                formula="(Total Prayers - Not Prayed) ÷ Total Prayers × 100"
                example="If you prayed 4 out of 5 prayers = (5-1) ÷ 5 × 100 = 80%"
              />
              
              <FormulaBox
                title="Masjid Percentage"
                formula="Masjid Prayers ÷ Total Prayers × 100"
                example="If 3 out of 5 prayers were in masjid = 3 ÷ 5 × 100 = 60%"
              />
              
              <FormulaBox
                title="Current Streak"
                formula="Consecutive days with all 5 prayers marked as Home/Masjid"
                example="If you completed all prayers for 7 days in a row = 7 day streak"
              />
              
              <FormulaBox
                title="Best Streak"
                formula="Highest consecutive days achieved in the selected period"
                example="Your longest streak in the current month was 15 days"
              />

              <FormulaBox
                title="Composite Score (Leaderboard & Progress)"
                formula="(Average × 45%) + (Consistency × 20%) + (Streak × 10%) + (Special × 10%) + (Days Tracked × 15%)"
                example="Special = Masjid% (Standard Mode) OR Surah Al‑Kahf Consistency (Home Mode; falls back to Consistency if no Fridays in the period). Days Tracked uses a timeframe-aware cap: week 7, last 30 days 30, month = days in month, year 60, all time 60."
              />

              <FormulaBox
                title="Days Tracked (15%)"
                formula="min(Total Days Tracked ÷ Cap, 1) × 100"
                example="Cap depends on the selected period: Week 7, Last 30 Days 30, Month = days in that month, Year 60, All Time 60"
              />
            </div>
          </SectionCard>

          {/* App Settings Guide */}
          <SectionCard
            id="settings"
            title="Settings & Toggles Guide"
            icon={Settings}
            isExpanded={expandedSection === 'settings'}
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                  <div className="flex items-center space-x-3 mb-3">
                    <Building className="w-5 h-5 text-jj-accent dark:text-teal-300" />
                    <h4 className="font-semibold text-jj-ink dark:text-stone-100">Masjid Mode Toggle</h4>
                  </div>
                  <p className="text-jj-ink/90 dark:text-stone-300 mb-3">
                    <strong>Location:</strong> Profile → Settings<br/>
                    <strong>Default:</strong> OFF (Standard Mode)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-jj bg-jj-mist/55 dark:bg-white/[0.04] p-3">
                      <h5 className="font-medium text-jj-ink dark:text-stone-100 mb-1">Standard Mode (OFF)</h5>
                      <p className="text-sm text-jj-muted dark:text-stone-400">
                        • Shows "Home" and "Masjid" options<br/>
                        • Rewards mosque attendance highly<br/>
                        • Best for regular mosque-goers
                      </p>
                    </div>
                    <div className="rounded-jj bg-teal-50/40 dark:bg-teal-950/15 p-3 ring-1 ring-teal-900/8 dark:ring-teal-600/15">
                      <h5 className="font-medium text-jj-ink dark:text-stone-100 mb-1">Home Mode (ON)</h5>
                      <p className="text-sm text-jj-muted dark:text-stone-400">
                        • Shows only "Prayed" option<br/>
                        • Equal points for all on-time prayers<br/>
                        • Best for home prayer preference
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                  <div className="flex items-center space-x-3 mb-3">
                    <Eye className="w-5 h-5 text-jj-accent dark:text-teal-300" />
                    <h4 className="font-semibold text-jj-ink dark:text-stone-100">Privacy Toggle</h4>
                  </div>
                  <p className="text-jj-ink/90 dark:text-stone-300 mb-3">
                    <strong>Location:</strong> Profile → Settings<br/>
                    <strong>Default:</strong> ON (Public)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-jj bg-jj-mist/55 dark:bg-white/[0.04] p-3">
                      <h5 className="font-medium text-jj-ink dark:text-stone-100 mb-1">Public (ON)</h5>
                      <p className="text-sm text-jj-muted dark:text-stone-400">
                        • Visible on leaderboards<br/>
                        • Others can add you as friend<br/>
                        • Participate in community features
                      </p>
                    </div>
                    <div className="rounded-jj bg-teal-50/40 dark:bg-teal-950/15 p-3 ring-1 ring-teal-900/8 dark:ring-teal-600/15">
                      <h5 className="font-medium text-jj-ink dark:text-stone-100 mb-1">Private (OFF)</h5>
                      <p className="text-sm text-jj-muted dark:text-stone-400">
                        • Hidden from leaderboards<br/>
                        • Personal tracking only<br/>
                        • Complete privacy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* How to Use the App */}
          <SectionCard
            id="guide"
            title="How to use the app"
            icon={BookOpen}
            isExpanded={expandedSection === 'guide'}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="w-5 h-5 text-jj-accent dark:text-teal-300" />
                      <h4 className="font-semibold text-jj-ink dark:text-stone-100">1. Track Daily Prayers</h4>
                    </div>
                    <p className="text-sm text-jj-ink/90 dark:text-stone-300">
                      • Go to Calendar section<br/>
                      • Click on any date<br/>
                      • Mark each prayer status<br/>
                      • Track Surah Al-Kahf on Fridays
                    </p>
                  </div>

                  <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                    <div className="flex items-center space-x-3 mb-3">
                      <TrendingUp className="w-5 h-5 text-jj-accent dark:text-teal-300" />
                      <h4 className="font-semibold text-jj-ink dark:text-stone-100">2. Monitor Progress</h4>
                    </div>
                    <p className="text-sm text-jj-ink/90 dark:text-stone-300">
                      • Visit Progress section<br/>
                      • View different time periods<br/>
                      • Analyze your statistics<br/>
                      • Get motivational insights
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                    <div className="flex items-center space-x-3 mb-3">
                      <Users className="w-5 h-5 text-jj-accent dark:text-teal-300" />
                      <h4 className="font-semibold text-jj-ink dark:text-stone-100">3. Join Leaderboards</h4>
                    </div>
                    <p className="text-sm text-jj-ink/90 dark:text-stone-300">
                      • Enable Public profile<br/>
                      • Compete with others<br/>
                      • Add friends<br/>
                      • Filter by prayer mode
                    </p>
                  </div>

                  <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                    <div className="flex items-center space-x-3 mb-3">
                      <Settings className="w-5 h-5 text-jj-accent dark:text-teal-300" />
                      <h4 className="font-semibold text-jj-ink dark:text-stone-100">4. Customize Settings</h4>
                    </div>
                    <p className="text-sm text-jj-ink/90 dark:text-stone-300">
                      • Set your prayer mode<br/>
                      • Adjust privacy settings<br/>
                      • Personalize your experience<br/>
                      • Update profile information
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-jj-xl p-5 sm:p-6 border border-jj-border/80 dark:border-white/[0.08] bg-jj-mist/30 dark:bg-white/[0.03]">
                <div className="flex items-start gap-3">
                  <Star className="w-6 h-6 text-jj-accent dark:text-teal-300 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <div>
                    <h4 className="font-semibold text-jj-ink dark:text-stone-100 mb-2">Practical tips</h4>
                    <ul className="text-jj-muted dark:text-stone-400 space-y-1.5 text-sm leading-relaxed">
                      <li>• Set your Masjid Mode based on your primary prayer location</li>
                      <li>• Track consistently for accurate statistics</li>
                      <li>• Use the Progress section to identify improvement areas</li>
                      <li>• Join leaderboards for motivation and community</li>
                      <li>• Don't forget to mark Surah Al-Kahf on Fridays!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Leaderboard System */}
          <SectionCard
            id="leaderboard"
            title="Leaderboard System"
            icon={Award}
            isExpanded={expandedSection === 'leaderboard'}
          >
            <div className="space-y-4">
              <p className="text-jj-ink/90 dark:text-stone-300">
                The leaderboard ensures fair competition by separating users based on their prayer modes and calculating composite scores.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                  <h4 className="font-semibold text-jj-ink dark:text-stone-100 mb-2">Filter options</h4>
                  <ul className="text-sm text-jj-ink/90 dark:text-stone-300 space-y-1">
                    <li>• All Users</li>
                    <li>• Standard Mode Only</li>
                    <li>• Home Mode Only</li>
                    <li>• Friends Only</li>
                  </ul>
                </div>

                <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                  <h4 className="font-semibold text-jj-ink dark:text-stone-100 mb-2">Time periods</h4>
                  <ul className="text-sm text-jj-ink/90 dark:text-stone-300 space-y-1">
                    <li>• This Week</li>
                    <li>• This Month</li>
                    <li>• This Year</li>
                    <li>• All Time</li>
                  </ul>
                </div>

                <div className="rounded-jj-lg p-4 border border-jj-border/80 dark:border-white/[0.08] bg-jj-surface dark:bg-jj-elevated-dark">
                  <h4 className="font-semibold text-jj-ink dark:text-stone-100 mb-2">Ranking factors</h4>
                  <ul className="text-sm text-jj-ink/90 dark:text-stone-300 space-y-1">
                    <li>• Average Score (45%)</li>
                    <li>• Consistency (20%)</li>
                    <li>• Current Streak (10%)</li>
                    <li>• Special (10%): Masjid % (Standard) or Surah Al‑Kahf Consistency (Home; falls back to Consistency if no Fridays)</li>
                    <li>• Days Tracked (15%) — timeframe-aware cap (Week 7, 30D 30, Month days-in-month, Year 60, All 60)</li>
                  </ul>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 sm:mt-12 pb-6">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-jj-muted dark:text-stone-500 max-w-md mx-auto">
            <Zap className="w-4 h-4 text-jj-accent dark:text-teal-400 shrink-0" strokeWidth={1.75} />
            <span className="text-sm leading-relaxed text-pretty">
              May Allah accept our prayers and grant us consistency in worship.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;
