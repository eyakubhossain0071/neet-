import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Award,
  Bell,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Filter,
  LogOut,
  MessageSquare,
  Moon,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Sun,
  Target,
  ThumbsUp,
  TrendingUp,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import {
  auth,
  clampInt,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  sanitizeString,
  SCHEMA_LIMITS,
} from './firebase';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from './usePWAInstall';
import {
  BadgeItem,
  CURATED_RESOURCES,
  DailyStudyLog,
  INITIAL_DAILY_LOGS,
  INITIAL_MOCK_TESTS,
  INITIAL_REMINDERS,
  INITIAL_SYLLABUS,
  MockTestEntry,
  NeetSubject,
  StudyReminder,
  StudyResource,
  SyllabusChapter,
} from './data/neetData';

type WorkspaceTab = 'overview' | 'syllabus' | 'analytics' | 'mentor' | 'community';

interface ForumPostDoc {
  id: string;
  authorId: string;
  authorName: string;
  subject: NeetSubject | 'Strategy';
  chapter: string;
  title: string;
  body: string;
  upvotes: number;
  replyCount: number;
  resolved: boolean;
  visibility: 'public';
}

interface StudyGroupDoc {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  focusTopic: string;
  weeklyGoalHours: number;
  memberCount: number;
  avgMockScore: number;
  visibility: 'public';
}

interface AIMentorResponse {
  overallDiagnosis: string;
  predictedScoreBand: string;
  negativeMarkingPrescription: string;
  priorityWeakTopics: {
    subject: string;
    chapter: string;
    ncertFocus: string;
    expectedQuestions: number;
  }[];
  sevenDayPlan: {
    day: string;
    focusBlock: string;
    pyqTarget: string;
  }[];
  directAnswer: string;
}

const DEFAULT_FORUM_POSTS: ForumPostDoc[] = [
  {
    id: 'seed_post_1',
    authorId: 'peer_aiims_1',
    authorName: 'Rohan Kulkarni (Target 690)',
    subject: 'Physics',
    chapter: 'System of Particles & Rotational Motion',
    title: 'Shortcut for pure rolling acceleration on inclined plane when solid cylinder vs hollow sphere?',
    body: 'In NCERT Exemplar Q.14, we compare time taken to reach bottom of incline. Using a = g sin(theta) / (1 + K^2/R^2), solid sphere has K^2/R^2 = 0.4 and disc has 0.5. Does mass or radius affect who reaches first?',
    upvotes: 18,
    replyCount: 4,
    resolved: true,
    visibility: 'public',
  },
  {
    id: 'seed_post_2',
    authorId: 'peer_aiims_2',
    authorName: 'Sneha Nair (Target 685)',
    subject: 'Botany',
    chapter: 'Principles & Molecular Basis of Inheritance',
    title: 'Confusion in NCERT statement: Euchromatin vs Heterochromatin transcription activity',
    body: 'Page 99 Class 12 NCERT states euchromatin is loosely packed and stains light, while heterochromatin is densely packed and stains dark. Which one is transcriptionally active in human interphase nuclei?',
    upvotes: 24,
    replyCount: 6,
    resolved: false,
    visibility: 'public',
  },
  {
    id: 'seed_post_3',
    authorId: 'peer_aiims_3',
    authorName: 'Kabir Verma (Target 670)',
    subject: 'Chemistry',
    chapter: 'Chemical & Ionic Equilibrium',
    title: 'How to quickly spot acidic vs basic buffer mixtures in NEET Section-B numericals?',
    body: 'When weak acid CH3COOH reacts with limited strong base NaOH (moles of acid > moles of NaOH), the resulting solution contains unreacted CH3COOH + CH3COONa. Can we directly apply Henderson-Hasselbalch here?',
    upvotes: 15,
    replyCount: 3,
    resolved: false,
    visibility: 'public',
  },
];

const DEFAULT_STUDY_GROUPS: StudyGroupDoc[] = [
  {
    id: 'group_ncert_680',
    ownerId: 'peer_lead_1',
    ownerName: 'Aditi Deshmukh',
    name: 'AIIMS Delhi 680+ NCERT Line-by-Line Squad',
    focusTopic: 'Class 12 Genetics, Biotechnology & Modern Physics PYQs',
    weeklyGoalHours: 56,
    memberCount: 42,
    avgMockScore: 648,
    visibility: 'public',
  },
  {
    id: 'group_night_owls',
    ownerId: 'peer_lead_2',
    ownerName: 'Vikramaditya Rao',
    name: 'Late-Night Physics & Organic Numericals Club',
    focusTopic: 'Rotational Mechanics, Ray Optics & Aldol/Cannizzaro Drills',
    weeklyGoalHours: 48,
    memberCount: 29,
    avgMockScore: 622,
    visibility: 'public',
  },
  {
    id: 'group_bio_360',
    ownerId: 'peer_lead_3',
    ownerName: 'Zoya Khan',
    name: 'Biology 360/360 Zero-Negative Sprint',
    focusTopic: 'Human Physiology Diagrams + Plant Kingdom Exceptions',
    weeklyGoalHours: 52,
    memberCount: 64,
    avgMockScore: 635,
    visibility: 'public',
  },
];

export default function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('aetherneet_dark_mode');
    return saved ? saved === 'true' : true;
  });

  // Auth & Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const isOnline = useOnlineStatus();

  // Core Student State (Persisted locally for offline access + synced to Firestore when authenticated)
  const [examDate, setExamDate] = useState<string>(() => {
    return localStorage.getItem('aetherneet_exam_date') || '2027-05-02';
  });
  const [targetScore, setTargetScore] = useState<number>(() => {
    const saved = localStorage.getItem('aetherneet_target_score');
    return saved ? Number(saved) : 680;
  });
  const [streakDays, setStreakDays] = useState<number>(() => {
    const saved = localStorage.getItem('aetherneet_streak_days');
    return saved ? Number(saved) : 14;
  });
  const [xpPoints, setXpPoints] = useState<number>(() => {
    const saved = localStorage.getItem('aetherneet_xp_points');
    return saved ? Number(saved) : 2450;
  });

  const [syllabus, setSyllabus] = useState<SyllabusChapter[]>(() => {
    const saved = localStorage.getItem('aetherneet_syllabus');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_SYLLABUS;
      }
    }
    return INITIAL_SYLLABUS;
  });

  const [mockTests, setMockTests] = useState<MockTestEntry[]>(() => {
    const saved = localStorage.getItem('aetherneet_mock_tests');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MOCK_TESTS;
      }
    }
    return INITIAL_MOCK_TESTS;
  });

  const [dailyLogs, setDailyLogs] = useState<DailyStudyLog[]>(() => {
    const saved = localStorage.getItem('aetherneet_daily_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_DAILY_LOGS;
      }
    }
    return INITIAL_DAILY_LOGS;
  });

  const [reminders, setReminders] = useState<StudyReminder[]>(() => {
    const saved = localStorage.getItem('aetherneet_reminders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_REMINDERS;
      }
    }
    return INITIAL_REMINDERS;
  });

  const [offlineResourceIds, setOfflineResourceIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('aetherneet_offline_resources');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ['res-bio-genetics', 'res-phy-rotational'];
      }
    }
    return ['res-bio-genetics', 'res-phy-rotational'];
  });

  // Live Exam Countdown State
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Pomodoro & Break Interval Timer State
  const [focusDurationMins, setFocusDurationMins] = useState<number>(50);
  const [breakDurationMins, setBreakDurationMins] = useState<number>(10);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(50 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Syllabus Filter State
  const [subjectFilter, setSubjectFilter] = useState<NeetSubject | 'All' | 'HighWeightage'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [syllabusSearch, setSyllabusSearch] = useState<string>('');

  // Mock Test Form State
  const [newMockTitle, setNewMockTitle] = useState<string>('');
  const [newMockDate, setNewMockDate] = useState<string>('2026-10-16');
  const [newPhysicsScore, setNewPhysicsScore] = useState<number>(150);
  const [newChemistryScore, setNewChemistryScore] = useState<number>(160);
  const [newBiologyScore, setNewBiologyScore] = useState<number>(340);
  const [newAccuracyPct, setNewAccuracyPct] = useState<number>(92);
  const [newNegativeLost, setNewNegativeLost] = useState<number>(14);

  // Daily Study Log Form State
  const [todayPhyHours, setTodayPhyHours] = useState<number>(3.0);
  const [todayChemHours, setTodayChemHours] = useState<number>(2.5);
  const [todayBioHours, setTodayBioHours] = useState<number>(3.5);
  const [todayQuestions, setTodayQuestions] = useState<number>(185);

  // AI Mentor State
  const [mentorLoading, setMentorLoading] = useState<boolean>(false);
  const [mentorQuestion, setMentorQuestion] = useState<string>('');
  const [mentorAnalysis, setMentorAnalysis] = useState<AIMentorResponse | null>(null);
  const [mentorError, setMentorError] = useState<string | null>(null);

  // Reminder Form State
  const [newReminderTitle, setNewReminderTitle] = useState<string>('');
  const [newReminderTime, setNewReminderTime] = useState<string>('16:00');
  const [newReminderSubject, setNewReminderSubject] = useState<NeetSubject | 'Break' | 'Revision'>('Revision');

  // Community Forum & Study Groups State
  const [forumPosts, setForumPosts] = useState<ForumPostDoc[]>(DEFAULT_FORUM_POSTS);
  const [studyGroups, setStudyGroups] = useState<StudyGroupDoc[]>(DEFAULT_STUDY_GROUPS);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>(['group_ncert_680']);
  const [forumSubjectFilter, setForumSubjectFilter] = useState<string>('All');
  const [newDoubtSubject, setNewDoubtSubject] = useState<NeetSubject | 'Strategy'>('Physics');
  const [newDoubtChapter, setNewDoubtChapter] = useState<string>('Rotational Motion');
  const [newDoubtTitle, setNewDoubtTitle] = useState<string>('');
  const [newDoubtBody, setNewDoubtBody] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupTopic, setNewGroupTopic] = useState<string>('');
  const [newGroupHours, setNewGroupHours] = useState<number>(50);

  // Resource Library State
  const [resourceFilter, setResourceFilter] = useState<string>('All');
  const [offlineOnlyFilter, setOfflineOnlyFilter] = useState<boolean>(false);
  const [selectedResource, setSelectedResource] = useState<StudyResource | null>(null);

  // Overview Mock Chart Series Visibility & Selected Inspection State
  const [chartSeries, setChartSeries] = useState<{
    total: boolean;
    biology: boolean;
    chemistry: boolean;
    physics: boolean;
  }>({
    total: true,
    biology: true,
    chemistry: true,
    physics: true,
  });
  const [inspectedMockId, setInspectedMockId] = useState<string | null>(null);

  const toggleChartSeries = (key: 'total' | 'biology' | 'chemistry' | 'physics') => {
    setChartSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Apply Dark Mode to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('aetherneet_dark_mode', String(darkMode));
  }, [darkMode]);

  // Persist core state locally for offline reliability
  useEffect(() => {
    localStorage.setItem('aetherneet_exam_date', examDate);
    localStorage.setItem('aetherneet_target_score', String(targetScore));
    localStorage.setItem('aetherneet_streak_days', String(streakDays));
    localStorage.setItem('aetherneet_xp_points', String(xpPoints));
    localStorage.setItem('aetherneet_syllabus', JSON.stringify(syllabus));
    localStorage.setItem('aetherneet_mock_tests', JSON.stringify(mockTests));
    localStorage.setItem('aetherneet_daily_logs', JSON.stringify(dailyLogs));
    localStorage.setItem('aetherneet_reminders', JSON.stringify(reminders));
    localStorage.setItem('aetherneet_offline_resources', JSON.stringify(offlineResourceIds));
  }, [
    examDate,
    targetScore,
    streakDays,
    xpPoints,
    syllabus,
    mockTests,
    dailyLogs,
    reminders,
    offlineResourceIds,
  ]);

  // 1-Second Ticker for NEET Exam Countdown & Pomodoro Break Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
      setTimerSecondsLeft((prev) => {
        if (!timerRunning) return prev;
        if (prev <= 1) {
          playAlertChime();
          const nextMode = timerMode === 'focus' ? 'break' : 'focus';
          const nextSeconds =
            (nextMode === 'focus' ? focusDurationMins : breakDurationMins) * 60;
          setTimerMode(nextMode);
          triggerBrowserNotification(
            nextMode === 'break'
              ? 'Break Interval Started — Rest Your Eyes'
              : 'Break Complete — Resume NEET Focus Block',
            nextMode === 'break'
              ? `Great focus session! Take a ${breakDurationMins}-minute hydration and eye-rest break.`
              : `Time for your ${focusDurationMins}-minute NCERT & PYQ sprint.`
          );
          return nextSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerMode, focusDurationMins, breakDurationMins]);

  // Web Audio Chime for Study & Break Reminders
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch {
      // Ignore audio context restrictions if not interacted
    }
  };

  // Browser Push Notification Helper
  const triggerBrowserNotification = (title: string, body: string) => {
    setStatusBanner(`${title}: ${body}`);
    setTimeout(() => setStatusBanner(null), 6000);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
        });
      } catch {
        // Fallback banner already displayed
      }
    }
  };

  const requestPushNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setStatusBanner('Browser notifications are handled via in-app banners in this preview.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        playAlertChime();
        triggerBrowserNotification(
          'AetherNEET Push Reminders Active',
          'Daily NEET study goal alerts and break interval reminders are now enabled.'
        );
      } else {
        setStatusBanner('In-app audio & banner reminders enabled for study goals and breaks.');
      }
    } catch {
      setStatusBanner('In-app audio & banner reminders enabled for study goals and breaks.');
    }
  };

  // Derived Metrics
  const completedChapters = useMemo(
    () => syllabus.filter((c) => c.masteryStatus === 'Completed'),
    [syllabus]
  );

  const syllabusCompletionPct = useMemo(
    () => Math.round((completedChapters.length / syllabus.length) * 100),
    [completedChapters.length, syllabus.length]
  );

  const subjectCompletionStats = useMemo(() => {
    const subjects: NeetSubject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    return subjects.map((subj) => {
      const all = syllabus.filter((c) => c.subject === subj);
      const done = all.filter((c) => c.masteryStatus === 'Completed').length;
      const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0;
      return { subject: subj, done, total: all.length, pct };
    });
  }, [syllabus]);

  const latestMock = useMemo(
    () => (mockTests.length > 0 ? mockTests[mockTests.length - 1] : null),
    [mockTests]
  );

  const averageMockScore = useMemo(() => {
    if (mockTests.length === 0) return 0;
    const sum = mockTests.reduce((acc, m) => acc + m.totalScore, 0);
    return Math.round(sum / mockTests.length);
  }, [mockTests]);

  const countdownParts = useMemo(() => {
    const targetMs = new Date(`${examDate}T09:00:00`).getTime();
    const diff = Math.max(0, targetMs - nowMs);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  }, [examDate, nowMs]);

  const badges: BadgeItem[] = useMemo(() => {
    const has650 = mockTests.some((m) => m.totalScore >= 650);
    const highAccuracy = mockTests.some((m) => m.accuracyPct >= 92);
    return [
      {
        id: 'badge-streak-7',
        title: '14-Day Discipline Streak',
        requirement: 'Maintain 7+ consecutive days of NEET study logs',
        xpReward: 500,
        unlocked: streakDays >= 7,
      },
      {
        id: 'badge-ncert-50',
        title: 'NCERT Halfway Milestone',
        requirement: 'Complete 50%+ of Class 11 & 12 NCERT syllabus',
        xpReward: 750,
        unlocked: syllabusCompletionPct >= 50,
      },
      {
        id: 'badge-650-club',
        title: '650+ AIIMS Contender',
        requirement: 'Score 650 or higher in a 720-scale NEET Mock Test',
        xpReward: 1000,
        unlocked: has650,
      },
      {
        id: 'badge-precision',
        title: 'Negative Marking Sniper',
        requirement: 'Achieve 92%+ accuracy in any Full Syllabus Mock',
        xpReward: 600,
        unlocked: highAccuracy,
      },
      {
        id: 'badge-offline-vault',
        title: 'Offline Vault Scholar',
        requirement: 'Cache 3+ NCERT revision modules for offline study',
        xpReward: 400,
        unlocked: offlineResourceIds.length >= 3,
      },
      {
        id: 'badge-bio-master',
        title: 'Biology 340+ Vanguard',
        requirement: 'Score 340+/360 in Biology (Botany + Zoology)',
        xpReward: 800,
        unlocked: mockTests.some((m) => m.biologyScore >= 340),
      },
    ];
  }, [streakDays, syllabusCompletionPct, mockTests, offlineResourceIds.length]);

  // Firebase Auth & Real-Time Firestore Listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        try {
          setSyncStatus('syncing');
          const userDocRef = doc(db, 'users', sanitizeId(currentUser.uid));
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (typeof data.examDate === 'string') setExamDate(data.examDate);
            if (typeof data.targetScore === 'number') setTargetScore(data.targetScore);
            if (typeof data.streakDays === 'number') setStreakDays(data.streakDays);
            if (typeof data.xpPoints === 'number') setXpPoints(data.xpPoints);
            if (Array.isArray(data.completedChapterIds)) {
              const completedSet = new Set(data.completedChapterIds);
              setSyllabus((prev) =>
                prev.map((ch) =>
                  completedSet.has(ch.id)
                    ? { ...ch, masteryStatus: 'Completed', ncertRead: true }
                    : ch
                )
              );
            }
          } else {
            // Bootstrap initial UserProfile document adhering strictly to firestore.rules
            const completedIds = syllabus
              .filter((c) => c.masteryStatus === 'Completed')
              .map((c) => sanitizeId(c.id))
              .slice(0, SCHEMA_LIMITS.MAX_COMPLETED_CHAPTERS);

            await setDoc(userDocRef, {
              uid: currentUser.uid,
              displayName: sanitizeString(
                currentUser.displayName || 'NEET Aspirant',
                SCHEMA_LIMITS.DISPLAY_NAME_MAX_LEN
              ),
              examDate: sanitizeString(examDate, SCHEMA_LIMITS.EXAM_DATE_MAX_LEN),
              targetScore: clampInt(targetScore, 0, 720),
              streakDays: clampInt(streakDays, 0, 3650),
              xpPoints: clampInt(xpPoints, 0, 1000000),
              syllabusCompletionPct: clampInt(syllabusCompletionPct, 0, 100),
              latestMockScore: clampInt(latestMock?.totalScore ?? 0, -180, 720),
              completedChapterIds: completedIds,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          setSyncStatus('synced');
        } catch (err) {
          setSyncStatus('error');
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // Attach Firestore listeners for Forum Posts, Study Groups, and User Mock Tests when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const forumQuery = query(
      collection(db, 'forumPosts'),
      where('visibility', '==', 'public')
    );
    const unsubForum = onSnapshot(
      forumQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ForumPostDoc[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              authorId: String(data.authorId || ''),
              authorName: String(data.authorName || 'NEET Peer'),
              subject: (data.subject as NeetSubject | 'Strategy') || 'Physics',
              chapter: String(data.chapter || 'General'),
              title: String(data.title || ''),
              body: String(data.body || ''),
              upvotes: Number(data.upvotes || 0),
              replyCount: Number(data.replyCount || 0),
              resolved: Boolean(data.resolved),
              visibility: 'public',
            };
          });
          setForumPosts([...loaded, ...DEFAULT_FORUM_POSTS]);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'forumPosts');
      }
    );

    const groupsQuery = query(
      collection(db, 'studyGroups'),
      where('visibility', '==', 'public')
    );
    const unsubGroups = onSnapshot(
      groupsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: StudyGroupDoc[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: String(data.ownerId || ''),
              ownerName: String(data.ownerName || 'Group Lead'),
              name: String(data.name || ''),
              focusTopic: String(data.focusTopic || ''),
              weeklyGoalHours: Number(data.weeklyGoalHours || 40),
              memberCount: Number(data.memberCount || 1),
              avgMockScore: Number(data.avgMockScore || 600),
              visibility: 'public',
            };
          });
          setStudyGroups([...loaded, ...DEFAULT_STUDY_GROUPS]);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'studyGroups');
      }
    );

    const userMocksQuery = query(
      collection(db, 'users', sanitizeId(user.uid), 'mockTests'),
      where('uid', '==', user.uid)
    );
    const unsubMocks = onSnapshot(
      userMocksQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudMocks: MockTestEntry[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || 'Mock Test'),
              testDate: String(data.testDate || '2026-10-16'),
              physicsScore: Number(data.physicsScore || 0),
              chemistryScore: Number(data.chemistryScore || 0),
              biologyScore: Number(data.biologyScore || 0),
              totalScore: Number(data.totalScore || 0),
              accuracyPct: Number(data.accuracyPct || 85),
              negativeMarksLost: 15,
            };
          });
          setMockTests((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const cm of cloudMocks) {
              if (!existingIds.has(cm.id)) merged.push(cm);
            }
            return merged;
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/mockTests`);
      }
    );

    return () => {
      unsubForum();
      unsubGroups();
      unsubMocks();
    };
  }, [authReady, user]);

  // Cloud Sync Trigger
  const syncProfileToCloud = async (
    updatedSyllabus = syllabus,
    updatedXp = xpPoints,
    updatedStreak = streakDays,
    updatedLatestScore = latestMock?.totalScore ?? 0
  ) => {
    if (!user) return;
    const path = `users/${sanitizeId(user.uid)}`;
    try {
      setSyncStatus('syncing');
      const completedIds = updatedSyllabus
        .filter((c) => c.masteryStatus === 'Completed')
        .map((c) => sanitizeId(c.id))
        .slice(0, SCHEMA_LIMITS.MAX_COMPLETED_CHAPTERS);
      const pct = Math.round((completedIds.length / updatedSyllabus.length) * 100);

      await updateDoc(doc(db, 'users', sanitizeId(user.uid)), {
        displayName: sanitizeString(
          user.displayName || 'NEET Aspirant',
          SCHEMA_LIMITS.DISPLAY_NAME_MAX_LEN
        ),
        examDate: sanitizeString(examDate, SCHEMA_LIMITS.EXAM_DATE_MAX_LEN),
        targetScore: clampInt(targetScore, 0, 720),
        streakDays: clampInt(updatedStreak, 0, 3650),
        xpPoints: clampInt(updatedXp, 0, 1000000),
        syllabusCompletionPct: clampInt(pct, 0, 100),
        latestMockScore: clampInt(updatedLatestScore, -180, 720),
        completedChapterIds: completedIds,
        updatedAt: serverTimestamp(),
      });
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setStatusBanner('Cloud Synchronization active across all your devices.');
      setTimeout(() => setStatusBanner(null), 4000);
    } catch (err) {
      setStatusBanner(
        err instanceof Error ? err.message : 'Google Sign-In could not be completed.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSyncStatus('idle');
  };

  // Syllabus Chapter Handlers
  const toggleChapterField = (
    chapterId: string,
    field: 'ncertRead' | 'pyqSolved'
  ) => {
    const next = syllabus.map((ch) => {
      if (ch.id !== chapterId) return ch;
      const updatedVal = !ch[field];
      const nextNcert = field === 'ncertRead' ? updatedVal : ch.ncertRead;
      const nextPyq = field === 'pyqSolved' ? updatedVal : ch.pyqSolved;
      const nextStatus: SyllabusChapter['masteryStatus'] =
        nextNcert && nextPyq
          ? 'Completed'
          : nextNcert || nextPyq
          ? 'In Progress'
          : ch.masteryStatus;
      return {
        ...ch,
        [field]: updatedVal,
        masteryStatus: nextStatus,
      };
    });
    const nextXp = xpPoints + 25;
    setSyllabus(next);
    setXpPoints(nextXp);
    if (user) {
      syncProfileToCloud(next, nextXp);
    }
  };

  const incrementChapterRevision = (chapterId: string) => {
    const next = syllabus.map((ch) =>
      ch.id === chapterId
        ? {
            ...ch,
            revisionCount: ch.revisionCount + 1,
            masteryStatus: 'Completed' as const,
            ncertRead: true,
          }
        : ch
    );
    const nextXp = xpPoints + 40;
    setSyllabus(next);
    setXpPoints(nextXp);
    if (user) {
      syncProfileToCloud(next, nextXp);
    }
  };

  const updateChapterMastery = (
    chapterId: string,
    status: SyllabusChapter['masteryStatus']
  ) => {
    const next = syllabus.map((ch) =>
      ch.id === chapterId
        ? {
            ...ch,
            masteryStatus: status,
            ncertRead: status === 'Completed' ? true : ch.ncertRead,
          }
        : ch
    );
    const nextXp = status === 'Completed' ? xpPoints + 50 : xpPoints;
    setSyllabus(next);
    setXpPoints(nextXp);
    if (user) {
      syncProfileToCloud(next, nextXp);
    }
  };

  // Log New Mock Test Score
  const handleAddMockTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const phy = clampInt(newPhysicsScore, -45, 180);
    const chem = clampInt(newChemistryScore, -45, 180);
    const bio = clampInt(newBiologyScore, -90, 360);
    const total = phy + chem + bio;
    const acc = clampInt(newAccuracyPct, 0, 100);
    const testId = sanitizeId(`mock_${Date.now()}`);
    const titleClean = sanitizeString(
      newMockTitle || `Full Syllabus Mock #${mockTests.length + 1}`,
      SCHEMA_LIMITS.MOCK_TITLE_MAX_LEN
    );

    const newEntry: MockTestEntry = {
      id: testId,
      title: titleClean,
      testDate: sanitizeString(newMockDate, SCHEMA_LIMITS.EXAM_DATE_MAX_LEN),
      physicsScore: phy,
      chemistryScore: chem,
      biologyScore: bio,
      totalScore: total,
      accuracyPct: acc,
      negativeMarksLost: clampInt(newNegativeLost, 0, 180),
    };

    const nextMocks = [...mockTests, newEntry];
    const nextXp = xpPoints + 150;
    setMockTests(nextMocks);
    setXpPoints(nextXp);
    setNewMockTitle('');

    if (user) {
      const path = `users/${sanitizeId(user.uid)}/mockTests/${testId}`;
      try {
        await setDoc(doc(db, 'users', sanitizeId(user.uid), 'mockTests', testId), {
          uid: user.uid,
          title: titleClean,
          testDate: newEntry.testDate,
          physicsScore: phy,
          chemistryScore: chem,
          biologyScore: bio,
          totalScore: total,
          accuracyPct: acc,
          createdAt: serverTimestamp(),
        });
        await syncProfileToCloud(syllabus, nextXp, streakDays, total);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  };

  // Log Daily Study Hours
  const handleLogDailyStudy = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number((todayPhyHours + todayChemHours + todayBioHours).toFixed(1));
    const newLog: DailyStudyLog = {
      date: new Date().toISOString().slice(0, 10),
      dayLabel: 'Today',
      physicsHours: todayPhyHours,
      chemistryHours: todayChemHours,
      biologyHours: todayBioHours,
      totalHours: total,
      goalHours: 8.0,
      questionsPracticed: todayQuestions,
    };
    setDailyLogs((prev) => [...prev.slice(1), newLog]);
    const nextStreak = streakDays + 1;
    const nextXp = xpPoints + 100;
    setStreakDays(nextStreak);
    setXpPoints(nextXp);
    setStatusBanner(`Logged ${total} hrs & ${todayQuestions} MCQs! Streak increased to ${nextStreak} days.`);
    setTimeout(() => setStatusBanner(null), 5000);
    if (user) {
      syncProfileToCloud(syllabus, nextXp, nextStreak);
    }
  };

  // Run Server-Side Gemini AI Mentor Diagnostics
  const runAIMentorDiagnostics = async () => {
    setMentorLoading(true);
    setMentorError(null);
    try {
      const weakChapters = syllabus
        .filter((c) => c.masteryStatus !== 'Completed')
        .map((c) => `${c.subject}: ${c.title} (${c.expectedQuestions} Qs)`);

      const res = await fetch('/api/mentor/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakChapters,
          completedCount: completedChapters.length,
          totalChapters: syllabus.length,
          mockTests: mockTests.slice(-5),
          targetScore,
          daysRemaining: countdownParts.days,
          customQuestion: mentorQuestion.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI Mentor response.');
      }
      setMentorAnalysis(data);
    } catch (err) {
      setMentorError(
        err instanceof Error
          ? err.message
          : 'Unable to reach AI Mentor service. Check your connection.'
      );
    } finally {
      setMentorLoading(false);
    }
  };

  // Offline Resource Vault Caching (Cache Storage API + LocalStorage)
  const toggleOfflineResource = async (resItem: StudyResource) => {
    const exists = offlineResourceIds.includes(resItem.id);
    const nextIds = exists
      ? offlineResourceIds.filter((id) => id !== resItem.id)
      : [...offlineResourceIds, resItem.id];
    setOfflineResourceIds(nextIds);

    if (!exists && 'caches' in window) {
      try {
        const cache = await caches.open('aetherneet-offline-vault-v1');
        const response = new Response(JSON.stringify(resItem), {
          headers: { 'Content-Type': 'application/json' },
        });
        await cache.put(`/offline-vault/${resItem.id}.json`, response);
      } catch {
        // LocalStorage backup already persists fullCURATED_RESOURCES
      }
    }
    setStatusBanner(
      exists
        ? `Removed "${resItem.title}" from Offline Vault.`
        : `Saved "${resItem.title}" for 100% offline access.`
    );
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Add Custom Study / Break Reminder
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    const item: StudyReminder = {
      id: `rem_${Date.now()}`,
      title: newReminderTitle.trim(),
      time: newReminderTime,
      subject: newReminderSubject,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      enabled: true,
    };
    setReminders((prev) => [...prev, item]);
    setNewReminderTitle('');
    setStatusBanner(`Scheduled reminder "${item.title}" at ${item.time}.`);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Create Peer Doubt Forum Post
  const handleCreateForumPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoubtTitle.trim() || !newDoubtBody.trim()) return;
    const postId = sanitizeId(`post_${Date.now()}`);
    const newPost: ForumPostDoc = {
      id: postId,
      authorId: user ? user.uid : 'local_student',
      authorName: sanitizeString(
        user?.displayName || 'You (NEET Aspirant)',
        SCHEMA_LIMITS.DISPLAY_NAME_MAX_LEN
      ),
      subject: newDoubtSubject,
      chapter: sanitizeString(newDoubtChapter, SCHEMA_LIMITS.CHAPTER_MAX_LEN),
      title: sanitizeString(newDoubtTitle, SCHEMA_LIMITS.TITLE_MAX_LEN),
      body: sanitizeString(newDoubtBody, SCHEMA_LIMITS.BODY_MAX_LEN),
      upvotes: 0,
      replyCount: 0,
      resolved: false,
      visibility: 'public',
    };

    setForumPosts((prev) => [newPost, ...prev]);
    setNewDoubtTitle('');
    setNewDoubtBody('');
    setXpPoints((prev) => prev + 30);

    if (user) {
      try {
        await setDoc(doc(db, 'forumPosts', postId), {
          authorId: user.uid,
          authorName: newPost.authorName,
          subject: newPost.subject,
          chapter: newPost.chapter,
          title: newPost.title,
          body: newPost.body,
          upvotes: 0,
          replyCount: 0,
          resolved: false,
          visibility: 'public',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `forumPosts/${postId}`);
      }
    }
  };

  const handleUpvotePost = async (post: ForumPostDoc) => {
    setForumPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, upvotes: p.upvotes + 1 } : p))
    );
    if (user && !post.id.startsWith('seed_') && !post.resolved) {
      try {
        await updateDoc(doc(db, 'forumPosts', sanitizeId(post.id)), {
          upvotes: clampInt(post.upvotes + 1, 0, 100000),
          replyCount: clampInt(post.replyCount, 0, 10000),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `forumPosts/${post.id}`);
      }
    }
  };

  // Create Study Group
  const handleCreateStudyGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupTopic.trim()) return;
    const groupId = sanitizeId(`group_${Date.now()}`);
    const newGroup: StudyGroupDoc = {
      id: groupId,
      ownerId: user ? user.uid : 'local_student',
      ownerName: sanitizeString(
        user?.displayName || 'You (NEET Aspirant)',
        SCHEMA_LIMITS.DISPLAY_NAME_MAX_LEN
      ),
      name: sanitizeString(newGroupName, SCHEMA_LIMITS.MOCK_TITLE_MAX_LEN),
      focusTopic: sanitizeString(newGroupTopic, SCHEMA_LIMITS.FOCUS_TOPIC_MAX_LEN),
      weeklyGoalHours: clampInt(newGroupHours, 1, 120),
      memberCount: 1,
      avgMockScore: clampInt(averageMockScore || 620, -180, 720),
      visibility: 'public',
    };

    setStudyGroups((prev) => [newGroup, ...prev]);
    setJoinedGroupIds((prev) => [...prev, groupId]);
    setNewGroupName('');
    setNewGroupTopic('');

    if (user) {
      try {
        await setDoc(doc(db, 'studyGroups', groupId), {
          ownerId: user.uid,
          ownerName: newGroup.ownerName,
          name: newGroup.name,
          focusTopic: newGroup.focusTopic,
          weeklyGoalHours: newGroup.weeklyGoalHours,
          memberCount: 1,
          avgMockScore: newGroup.avgMockScore,
          visibility: 'public',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `studyGroups/${groupId}`);
      }
    }
  };

  // Social Progress Share Handler
  const handleShareProgress = async () => {
    const shareText = `AetherNEET Study Progress Report:
• NCERT Syllabus Completed: ${syllabusCompletionPct}% (${completedChapters.length}/${syllabus.length} high-yield chapters)
• Latest Mock Score: ${latestMock?.totalScore ?? 0}/720 (Avg: ${averageMockScore}/720 · Target: ${targetScore}/720)
• Active Streak: ${streakDays} Days · ${xpPoints} XP
• Countdown to NEET UG: ${countdownParts.days} Days remaining`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My NEET UG Progress on AetherNEET',
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setStatusBanner('Copied formatted NEET Progress Report to clipboard for sharing with study groups!');
      setTimeout(() => setStatusBanner(null), 5000);
    } catch {
      setStatusBanner('Progress report ready to share with peers.');
    }
  };

  // Filtered Syllabus List
  const filteredSyllabus = useMemo(() => {
    return syllabus.filter((ch) => {
      if (subjectFilter === 'HighWeightage' && ch.expectedQuestions < 5) return false;
      if (
        subjectFilter !== 'All' &&
        subjectFilter !== 'HighWeightage' &&
        ch.subject !== subjectFilter
      ) {
        return false;
      }
      if (statusFilter !== 'All' && ch.masteryStatus !== statusFilter) return false;
      if (
        syllabusSearch.trim() &&
        !ch.title.toLowerCase().includes(syllabusSearch.toLowerCase()) &&
        !ch.highYieldSubtopics.toLowerCase().includes(syllabusSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [syllabus, subjectFilter, statusFilter, syllabusSearch]);

  // Filtered Resources List
  const filteredResources = useMemo(() => {
    return CURATED_RESOURCES.filter((r) => {
      if (offlineOnlyFilter && !offlineResourceIds.includes(r.id)) return false;
      if (resourceFilter !== 'All' && r.subject !== resourceFilter) return false;
      return true;
    });
  }, [resourceFilter, offlineOnlyFilter, offlineResourceIds]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <OfflineIndicator />

      {/* Top Bar Contract: Strict 3-Zone Single-Row Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
        >
          AetherNEET
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'syllabus'
                ? 'border-emerald-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            NCERT Syllabus
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'analytics'
                ? 'border-emerald-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mock Analytics
          </button>
          <button
            onClick={() => setActiveTab('mentor')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'mentor'
                ? 'border-emerald-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            AI Mentor & Planner
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'community'
                ? 'border-emerald-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Peer Hub & Library
          </button>
        </nav>

        {/* Zone 3: Primary Action (Cloud Sync / Auth) */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              onClick={() => syncProfileToCloud()}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              {syncStatus === 'syncing' ? 'Syncing Cloud...' : 'Cloud Synced'}
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              Enable Cloud Sync
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {(
          [
            ['overview', 'Overview'],
            ['syllabus', 'Syllabus'],
            ['analytics', 'Mocks'],
            ['mentor', 'AI Mentor'],
            ['community', 'Peer & Vault'],
          ] as [WorkspaceTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === key
                ? 'bg-slate-900 text-white dark:bg-emerald-600'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Workspace Command & Telemetry Bar (Below Header) */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* NEET Exam Countdown Timer */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                NEET UG Final Countdown ({examDate}):
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-white">
              <span>{String(countdownParts.days).padStart(3, '0')}d</span>
              <span>:</span>
              <span>{String(countdownParts.hours).padStart(2, '0')}h</span>
              <span>:</span>
              <span>{String(countdownParts.minutes).padStart(2, '0')}m</span>
              <span>:</span>
              <span>{String(countdownParts.seconds).padStart(2, '0')}s</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{streakDays}d Streak</span>
              <span aria-hidden="true">·</span>
              <span>{xpPoints.toLocaleString()} XP</span>
              <span aria-hidden="true">·</span>
              <span>{ isOnline ? 'Online' : 'Offline Vault Active' }</span>
            </div>
          </div>

          {/* Interactive Break Interval Timer + Dark Mode + Share + Install */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pomodoro Focus / Break Widget */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {timerMode === 'focus' ? 'Focus Block' : 'Eye Break'}:
              </span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-emerald-400">
                {formatTimer(timerSecondsLeft)}
              </span>
              <button
                onClick={() => setTimerRunning((r) => !r)}
                className="px-2 py-0.5 rounded bg-slate-900 dark:bg-emerald-600 text-white font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  const next = timerMode === 'focus' ? 'break' : 'focus';
                  setTimerMode(next);
                  setTimerSecondsLeft(
                    (next === 'focus' ? focusDurationMins : breakDurationMins) * 60
                  );
                }}
                title="Switch Focus / Break Mode"
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <PWAInstallButton />

            <button
              onClick={handleShareProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Progress
            </button>

            <button
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle Dark Mode"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>Night Mode</span>
                </>
              )}
            </button>

            {user && (
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Notification / Action Toast Banner */}
      {statusBanner && (
        <div className="bg-emerald-950 text-emerald-100 border-b border-emerald-800 px-6 py-2.5 text-xs">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{statusBanner}</span>
            </div>
            <button
              onClick={() => setStatusBanner(null)}
              className="text-emerald-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport (1440px Baseline) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8 space-y-8">
        {/* =========================================================
            TAB 1: OVERVIEW & DAILY PROGRESS CHARTS
           ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top Row: KPI Strip (4 Columns, Tabular Numerals, Single Elevation) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  NCERT Syllabus Completion
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {syllabusCompletionPct}%
                  </span>
                  <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {completedChapters.length} / {syllabus.length} Chapters
                  </span>
                </div>
                <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${syllabusCompletionPct}%` }}
                  />
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Latest 720-Scale Mock Score
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {latestMock?.totalScore ?? 0} / 720
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Avg: {averageMockScore} · Target: {targetScore}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  PHY {latestMock?.physicsScore ?? 0} · CHEM {latestMock?.chemistryScore ?? 0} · BIO{' '}
                  {latestMock?.biologyScore ?? 0}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Consistency Streak & Gamified XP
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {streakDays} Days
                  </span>
                  <span className="text-xs font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {xpPoints.toLocaleString()} XP
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {badges.filter((b) => b.unlocked).length} of {badges.length} Achievement Badges Unlocked
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Exam Date & Target Configuration
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    aria-label="Target NEET Exam Date"
                    className="px-2.5 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={400}
                    max={720}
                    value={targetScore}
                    onChange={(e) => setTargetScore(clampInt(Number(e.target.value), 400, 720))}
                    aria-label="Target NEET Score"
                    className="w-20 px-2.5 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Pace needed: {Math.max(1, Math.ceil((syllabus.length - completedChapters.length) / Math.max(1, Math.floor(countdownParts.days / 7))))} ch/week
                </div>
              </div>
            </div>

            {/* Second Row: Progress Visualization Charts (Mock Score Trend + Daily Study Hours) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Mock Test Score Trend Chart (7 Columns) */}
              <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Mock Test Score & Subject-Wise Trajectory
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Click any legend item below to toggle Total (/720), Biology (/360), Chemistry (/180), or Physics (/180) trend lines
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      Log Mock Score
                    </button>
                  </div>

                  {/* Interactive Toggling Legend Controls */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(
                      [
                        {
                          key: 'total',
                          label: 'Total (/720)',
                          colorHex: '#10B981',
                          latestVal: `${latestMock?.totalScore ?? 0}/720`,
                        },
                        {
                          key: 'biology',
                          label: 'Biology (/360)',
                          colorHex: '#06B6D4',
                          latestVal: `${latestMock?.biologyScore ?? 0}/360`,
                        },
                        {
                          key: 'chemistry',
                          label: 'Chemistry (/180)',
                          colorHex: '#F59E0B',
                          latestVal: `${latestMock?.chemistryScore ?? 0}/180`,
                        },
                        {
                          key: 'physics',
                          label: 'Physics (/180)',
                          colorHex: '#6366F1',
                          latestVal: `${latestMock?.physicsScore ?? 0}/180`,
                        },
                      ] as const
                    ).map((item) => {
                      const active = chartSeries[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleChartSeries(item.key)}
                          aria-pressed={active}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-slate-900/5 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xs'
                              : 'bg-transparent border-slate-200/70 dark:border-slate-800/70 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <span
                            className="w-3 h-0.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: active ? item.colorHex : '#94A3B8',
                            }}
                          />
                          <span>{item.label}</span>
                          <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                            {item.latestVal}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Multi-Series SVG Line Chart (Dual Axis: Left Total /720, Right Section Mastery %) */}
                  <div className="mt-5">
                    <svg
                      viewBox="0 0 660 230"
                      className="w-full h-56 overflow-visible"
                      role="img"
                      aria-label="NEET Mock Test Subject-Wise Score Progression Chart"
                    >
                      {/* Horizontal Reference Grid Lines (55% to 100% normalized scale) */}
                      {[
                        { totalMark: 400, pctLabel: '56%' },
                        { totalMark: 480, pctLabel: '67%' },
                        { totalMark: 560, pctLabel: '78%' },
                        { totalMark: 640, pctLabel: '89%' },
                        { totalMark: 720, pctLabel: '100%' },
                      ].map(({ totalMark, pctLabel }) => {
                        const norm = totalMark / 720; // 0.555 .. 1.0
                        const y = 192 - ((norm - 0.55) / 0.45) * 162;
                        return (
                          <g key={totalMark}>
                            <line
                              x1="44"
                              y1={y}
                              x2="612"
                              y2={y}
                              stroke="currentColor"
                              className="text-slate-200 dark:text-slate-800"
                              strokeDasharray="4 4"
                            />
                            {/* Left Y-Axis: Total Marks (/720) */}
                            <text
                              x="38"
                              y={y + 4}
                              textAnchor="end"
                              className="text-[10px] fill-slate-400 font-mono"
                            >
                              {totalMark}
                            </text>
                            {/* Right Y-Axis: Section Percentage Scale */}
                            <text
                              x="618"
                              y={y + 4}
                              textAnchor="start"
                              className="text-[10px] fill-slate-400 font-mono"
                            >
                              {pctLabel}
                            </text>
                          </g>
                        );
                      })}

                      {/* Target Score Benchmark Line */}
                      {chartSeries.total &&
                        (() => {
                          const clampedTarget = Math.max(400, Math.min(720, targetScore));
                          const targetNorm = clampedTarget / 720;
                          const targetY = 192 - ((targetNorm - 0.55) / 0.45) * 162;
                          return (
                            <g>
                              <line
                                x1="44"
                                y1={targetY}
                                x2="612"
                                y2={targetY}
                                stroke="#10B981"
                                strokeWidth="1.25"
                                strokeDasharray="6 4"
                              />
                              <text
                                x="608"
                                y={targetY - 5}
                                textAnchor="end"
                                className="text-[10px] fill-emerald-600 dark:fill-emerald-400 font-mono"
                              >
                                Target {targetScore}/720
                              </text>
                            </g>
                          );
                        })()}

                      {/* Multi-Series Polylines & Interactive Nodes */}
                      {(() => {
                        const visibleMocks = mockTests.slice(-7);
                        if (visibleMocks.length === 0) return null;
                        const stepX =
                          visibleMocks.length > 1 ? 520 / (visibleMocks.length - 1) : 0;

                        const toY = (score: number, maxScore: number) => {
                          const ratio = Math.max(0.55, Math.min(1.0, score / maxScore));
                          return 192 - ((ratio - 0.55) / 0.45) * 162;
                        };

                        const seriesConfigs = [
                          {
                            key: 'physics' as const,
                            enabled: chartSeries.physics,
                            color: '#6366F1',
                            strokeWidth: 2,
                            dash: '3 2',
                            getVal: (m: MockTestEntry) => m.physicsScore,
                            max: 180,
                            labelOffset: 13,
                          },
                          {
                            key: 'chemistry' as const,
                            enabled: chartSeries.chemistry,
                            color: '#F59E0B',
                            strokeWidth: 2,
                            dash: '',
                            getVal: (m: MockTestEntry) => m.chemistryScore,
                            max: 180,
                            labelOffset: -8,
                          },
                          {
                            key: 'biology' as const,
                            enabled: chartSeries.biology,
                            color: '#06B6D4',
                            strokeWidth: 2.25,
                            dash: '',
                            getVal: (m: MockTestEntry) => m.biologyScore,
                            max: 360,
                            labelOffset: -9,
                          },
                          {
                            key: 'total' as const,
                            enabled: chartSeries.total,
                            color: '#10B981',
                            strokeWidth: 3,
                            dash: '',
                            getVal: (m: MockTestEntry) => m.totalScore,
                            max: 720,
                            labelOffset: -10,
                          },
                        ];

                        return (
                          <>
                            {/* X-Axis Date Labels */}
                            {visibleMocks.map((m, idx) => {
                              const x = 68 + idx * stepX;
                              const isInspected =
                                (inspectedMockId || visibleMocks[visibleMocks.length - 1].id) ===
                                m.id;
                              return (
                                <g
                                  key={`axis-${m.id}`}
                                  onClick={() => setInspectedMockId(m.id)}
                                  className="cursor-pointer"
                                >
                                  {isInspected && (
                                    <line
                                      x1={x}
                                      y1="26"
                                      x2={x}
                                      y2="192"
                                      stroke="currentColor"
                                      className="text-slate-300 dark:text-slate-700"
                                      strokeWidth="1"
                                    />
                                  )}
                                  <text
                                    x={x}
                                    y={214}
                                    textAnchor="middle"
                                    className={`text-[10px] font-mono ${
                                      isInspected
                                        ? 'fill-slate-900 dark:fill-white font-semibold'
                                        : 'fill-slate-500'
                                    }`}
                                  >
                                    {m.testDate.slice(5)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Series Lines & Points */}
                            {seriesConfigs
                              .filter((s) => s.enabled)
                              .map((s) => {
                                const pts = visibleMocks.map((m, idx) => ({
                                  x: 68 + idx * stepX,
                                  y: toY(s.getVal(m), s.max),
                                  val: s.getVal(m),
                                  m,
                                }));
                                const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

                                return (
                                  <g key={s.key}>
                                    <polyline
                                      fill="none"
                                      stroke={s.color}
                                      strokeWidth={s.strokeWidth}
                                      strokeDasharray={s.dash || undefined}
                                      points={polyPoints}
                                    />
                                    {pts.map((p, idx) => {
                                      const isLastOrInspected =
                                        idx === pts.length - 1 ||
                                        p.m.id === inspectedMockId ||
                                        s.key === 'total';
                                      return (
                                        <g
                                          key={`${s.key}-${p.m.id}`}
                                          onClick={() => setInspectedMockId(p.m.id)}
                                          className="cursor-pointer"
                                        >
                                          <circle
                                            cx={p.x}
                                            cy={p.y}
                                            r={s.key === 'total' ? 4.5 : 3.5}
                                            fill={s.color}
                                            className="stroke-white dark:stroke-slate-900"
                                            strokeWidth="1.75"
                                          />
                                          {isLastOrInspected && (
                                            <text
                                              x={p.x}
                                              y={p.y + s.labelOffset}
                                              textAnchor="middle"
                                              fill={s.color}
                                              className="text-[10px] font-mono font-semibold"
                                            >
                                              {p.val}
                                            </text>
                                          )}
                                        </g>
                                      );
                                    })}
                                  </g>
                                );
                              })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Interactive Diagnostic Breakdown Strip for Inspected Mock Test */}
                  {(() => {
                    const visibleMocks = mockTests.slice(-7);
                    const activeMock =
                      visibleMocks.find((m) => m.id === inspectedMockId) ||
                      visibleMocks[visibleMocks.length - 1];
                    if (!activeMock) return null;

                    return (
                      <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          <span>{activeMock.title}</span>
                          <span className="text-slate-400" aria-hidden="true">
                            {' '}
                            ·{' '}
                          </span>
                          <span className="font-mono text-slate-500">{activeMock.testDate}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            TOT {activeMock.totalScore}/720 (
                            {Math.round((activeMock.totalScore / 720) * 100)}%)
                          </span>
                          <span className="text-cyan-600 dark:text-cyan-400">
                            BIO {activeMock.biologyScore}/360 (
                            {Math.round((activeMock.biologyScore / 360) * 100)}%)
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            CHEM {activeMock.chemistryScore}/180 (
                            {Math.round((activeMock.chemistryScore / 180) * 100)}%)
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            PHY {activeMock.physicsScore}/180 (
                            {Math.round((activeMock.physicsScore / 180) * 100)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Subject Mastery Progress Strip */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {subjectCompletionStats.map((st) => (
                    <div key={st.subject}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {st.subject}
                        </span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {st.pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 dark:bg-emerald-500"
                          style={{ width: `${st.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Study Hours Chart & Logger (5 Columns) */}
              <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    7-Day Daily Study Hours & MCQ Output
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Subject-stacked daily hours vs 8.0 hr benchmark
                  </p>

                  {/* Stacked Bar Chart */}
                  <div className="mt-6 grid grid-cols-7 gap-2 items-end h-40 pt-4 border-b border-slate-200 dark:border-slate-800">
                    {dailyLogs.map((log) => {
                      const heightPct = Math.min(100, Math.round((log.totalHours / 11) * 100));
                      return (
                        <div
                          key={log.date + log.dayLabel}
                          className="flex flex-col items-center h-full justify-end"
                        >
                          <span className="text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 mb-1">
                            {log.totalHours}h
                          </span>
                          <div
                            className="w-full max-w-[28px] rounded-t bg-emerald-600 dark:bg-emerald-500 transition-all"
                            style={{ height: `${heightPct}%` }}
                            title={`${log.dayLabel}: Physics ${log.physicsHours}h, Chemistry ${log.chemistryHours}h, Biology ${log.biologyHours}h (${log.questionsPracticed} MCQs)`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-7 gap-2 mt-2 text-center">
                    {dailyLogs.map((log) => (
                      <span
                        key={log.date + log.dayLabel}
                        className="text-[11px] font-mono text-slate-500"
                      >
                        {log.dayLabel}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Daily Study Logger Form */}
                <form
                  onSubmit={handleLogDailyStudy}
                  className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3"
                >
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Log Today&apos;s Study Hours & MCQs (+100 XP)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500">PHY (h)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={todayPhyHours}
                        onChange={(e) => setTodayPhyHours(Number(e.target.value))}
                        className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500">CHEM (h)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={todayChemHours}
                        onChange={(e) => setTodayChemHours(Number(e.target.value))}
                        className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500">BIO (h)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={todayBioHours}
                        onChange={(e) => setTodayBioHours(Number(e.target.value))}
                        className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500">MCQs</label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={todayQuestions}
                        onChange={(e) => setTodayQuestions(Number(e.target.value))}
                        className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Record Today&apos;s Session & Extend Streak
                  </button>
                </form>
              </div>
            </div>

            {/* Third Row: Gamification Achievements & Priority Revision Chapters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Gamified Milestones & Badges (6 Columns) */}
              <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Milestones & Achievement Badges
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Automatically unlocked by your NCERT completion, streaks, and mock scores
                    </p>
                  </div>
                  <Award className="w-5 h-5 text-amber-500 shrink-0" />
                </div>

                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              b.unlocked
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {b.title}
                          </span>
                          <span className="text-xs text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{b.xpReward} XP
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {b.requirement}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono whitespace-nowrap shrink-0 ${
                          b.unlocked
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {b.unlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* High-Weightage Chapters Needing Immediate Revision (6 Columns) */}
              <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Priority Revision Queue
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      High-weightage chapters flagged as Needs Revision or In Progress
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('mentor')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    Ask AI Mentor
                  </button>
                </div>

                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {syllabus
                    .filter((c) => c.masteryStatus !== 'Completed')
                    .slice(0, 5)
                    .map((ch) => (
                      <div
                        key={ch.id}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {ch.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{ch.subject}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{ch.classLevel}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono tabular-nums">
                              ~{ch.expectedQuestions} Qs in NEET
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => incrementChapterRevision(ch.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                        >
                          Mark Revised
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: NCERT SYLLABUS COMPLETION TRACKER
           ========================================================= */}
        {activeTab === 'syllabus' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  NCERT Class 11 & 12 Syllabus Tracker
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Track line-by-line NCERT reading, 10-year PYQ completion, and revision cycles across all 30 core NEET units
                </p>
              </div>

              {/* Interactive Subject Filter Bar */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                {(
                  ['All', 'Physics', 'Chemistry', 'Botany', 'Zoology', 'HighWeightage'] as const
                ).map((subj) => (
                  <button
                    key={subj}
                    onClick={() => setSubjectFilter(subj)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      subjectFilter === subj
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {subj === 'HighWeightage' ? 'High Weightage (5+ Qs)' : subj}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Status Filter Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={syllabusSearch}
                  onChange={(e) => setSyllabusSearch(e.target.value)}
                  placeholder="Search NCERT chapter or subtopic (e.g., Lac Operon, Rotational, Optics)..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                {(['All', 'Completed', 'In Progress', 'Needs Revision'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        statusFilter === st
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* High-Density Syllabus Data Grid */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Chapter & High-Yield NCERT Subtopics</th>
                    <th className="py-3 px-4">Subject · Class</th>
                    <th className="py-3 px-4 text-right font-mono">Weightage</th>
                    <th className="py-3 px-4 text-center">NCERT Read</th>
                    <th className="py-3 px-4 text-center">10-Yr PYQs</th>
                    <th className="py-3 px-4 text-right">Revisions</th>
                    <th className="py-3 px-4 text-right">Mastery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredSyllabus.map((ch) => (
                    <tr
                      key={ch.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {ch.title}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {ch.highYieldSubtopics}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <span>{ch.subject}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-slate-400">{ch.classLevel}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {ch.expectedQuestions} Qs ({ch.expectedQuestions * 4}m)
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleChapterField(ch.id, 'ncertRead')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            ch.ncertRead
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          {ch.ncertRead ? 'Done' : 'Mark'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleChapterField(ch.id, 'pyqSolved')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            ch.pyqSolved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          {ch.pyqSolved ? 'Solved' : 'Pending'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <button
                          onClick={() => incrementChapterRevision(ch.id)}
                          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                        >
                          {ch.revisionCount}x (+1)
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <select
                          value={ch.masteryStatus}
                          onChange={(e) =>
                            updateChapterMastery(
                              ch.id,
                              e.target.value as SyllabusChapter['masteryStatus']
                            )
                          }
                          aria-label={`Mastery status for ${ch.title}`}
                          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                        >
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Needs Revision">Needs Revision</option>
                          <option value="Not Started">Not Started</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: MOCK TEST SCORE LOGGER & PROGRESS ANALYTICS
           ========================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                720-Scale Mock Test Score Logger & Trend Analytics
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Analyze Physics (180), Chemistry (180), and Biology (360) score trends, accuracy percentage, and negative marking (-1) loss
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Record New Mock Test Form (4 Columns) */}
              <form
                onSubmit={handleAddMockTest}
                className="lg:col-span-4 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Log New Mock Test Result
                </h2>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Test Title / Series Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newMockTitle}
                    onChange={(e) => setNewMockTitle(e.target.value)}
                    placeholder="e.g., Allen Major Full Syllabus #06"
                    className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Test Date
                    </label>
                    <input
                      type="date"
                      value={newMockDate}
                      onChange={(e) => setNewMockDate(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Accuracy (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newAccuracyPct}
                      onChange={(e) => setNewAccuracyPct(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Physics (/180)
                    </label>
                    <input
                      type="number"
                      min="-45"
                      max="180"
                      value={newPhysicsScore}
                      onChange={(e) => setNewPhysicsScore(Number(e.target.value))}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Chem (/180)
                    </label>
                    <input
                      type="number"
                      min="-45"
                      max="180"
                      value={newChemistryScore}
                      onChange={(e) => setNewChemistryScore(Number(e.target.value))}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Biology (/360)
                    </label>
                    <input
                      type="number"
                      min="-90"
                      max="360"
                      value={newBiologyScore}
                      onChange={(e) => setNewBiologyScore(Number(e.target.value))}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Marks Lost to Negative Marking (-1 per wrong MCQ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={newNegativeLost}
                    onChange={(e) => setNewNegativeLost(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  <span>Computed Total:</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {newPhysicsScore + newChemistryScore + newBiologyScore} / 720
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Save Mock Test & Sync Cloud (+150 XP)
                </button>
              </form>

              {/* Subject Breakdown Table & Negative Marking Ledger (8 Columns) */}
              <div className="lg:col-span-8 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Mock Test Ledger & Subject-Wise Telemetry
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Every score uses tabular figures for instant vertical comparison across subjects
                  </p>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                          <th className="py-2.5 px-3">Mock Test</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">PHY (/180)</th>
                          <th className="py-2.5 px-3 text-right">CHEM (/180)</th>
                          <th className="py-2.5 px-3 text-right">BIO (/360)</th>
                          <th className="py-2.5 px-3 text-right">Accuracy</th>
                          <th className="py-2.5 px-3 text-right">Total (/720)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono tabular-nums">
                        {mockTests.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-sans font-medium text-slate-900 dark:text-white">
                              {m.title}
                            </td>
                            <td className="py-3 px-3 text-slate-500">{m.testDate}</td>
                            <td className="py-3 px-3 text-right">{m.physicsScore}</td>
                            <td className="py-3 px-3 text-right">{m.chemistryScore}</td>
                            <td className="py-3 px-3 text-right">{m.biologyScore}</td>
                            <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                              {m.accuracyPct}%
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                              {m.totalScore}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    Net Score Improvement Since Mock #01:{' '}
                    <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{mockTests.length > 1 ? mockTests[mockTests.length - 1].totalScore - mockTests[0].totalScore : 0} Marks
                    </span>
                  </div>
                  <div>
                    Distance to Target ({targetScore}/720):{' '}
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {Math.max(0, targetScore - (latestMock?.totalScore ?? 0))} Marks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: PERSONALIZED AI MENTOR & STUDY REMINDERS
           ========================================================= */}
        {activeTab === 'mentor' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Personalized AI Mentor Panel (7 Columns) */}
              <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                      Personalized NEET AI Mentor & Weak-Area Strategist
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Analyzes your incomplete NCERT chapters ({syllabus.length - completedChapters.length} pending) and mock test scores ({latestMock?.totalScore ?? 0}/720)
                    </p>
                  </div>
                  <button
                    onClick={runAIMentorDiagnostics}
                    disabled={mentorLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Brain className="w-4 h-4" />
                    {mentorLoading ? 'Analyzing Telemetry...' : 'Generate AI Diagnosis & 7-Day Plan'}
                  </button>
                </div>

                {/* Optional Doubt / Focus Prompt */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Ask a Specific NEET Strategy or Concept Doubt (Optional)
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      value={mentorQuestion}
                      onChange={(e) => setMentorQuestion(e.target.value)}
                      placeholder="e.g., How do I stop losing marks in Physics Rotational Motion and Ionic Equilibrium?"
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {mentorError && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                    {mentorError}
                  </div>
                )}

                {mentorAnalysis ? (
                  <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-xs text-slate-500">Clinical Trajectory Diagnosis</div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                          {mentorAnalysis.overallDiagnosis}
                        </p>
                        <div className="mt-2 text-xs font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          Projected Band: {mentorAnalysis.predictedScoreBand}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                        <div className="text-xs text-slate-500">
                          Negative Marking (+4/-1) Prescription
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                          {mentorAnalysis.negativeMarkingPrescription}
                        </p>
                      </div>
                    </div>

                    {mentorAnalysis.directAnswer && (
                      <div className="p-4 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                        <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          Mentor Response & NCERT Pearl
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                          {mentorAnalysis.directAnswer}
                        </p>
                      </div>
                    )}

                    {/* Priority Weak Topics */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                        Priority High-Yield Weak Topics Identified
                      </h3>
                      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                        {mentorAnalysis.priorityWeakTopics.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 flex items-center justify-between gap-4 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {item.subject}: {item.chapter}
                              </span>
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                                {item.ncertFocus}
                              </p>
                            </div>
                            <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                              ~{item.expectedQuestions} Qs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 7-Day Micro-Schedule */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                        Personalized 7-Day Revision Plan
                      </h3>
                      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                        {mentorAnalysis.sevenDayPlan.map((d, idx) => (
                          <div
                            key={idx}
                            className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                {d.day}:
                              </span>{' '}
                              <span className="text-slate-700 dark:text-slate-300">
                                {d.focusBlock}
                              </span>
                            </div>
                            <span className="font-mono text-slate-500">{d.pyqTarget}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Ready to Diagnose Your Current Weak Areas:
                    </div>
                    <p>
                      Click <strong>Generate AI Diagnosis & 7-Day Plan</strong> above to send your incomplete syllabus chapters (like Rotational Motion, Chemical & Ionic Equilibrium, Aldehydes & Ketones, Neural & Chemical Coordination) and mock test score breakdown to the Gemini NEET Mentor.
                    </p>
                  </div>
                )}
              </div>

              {/* Study Reminders, Push Notifications & Break Intervals (5 Columns) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        Push Notifications & Break Intervals
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure study block duration, eye-rest intervals, and daily browser push alerts
                      </p>
                    </div>
                    <button
                      onClick={requestPushNotifications}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                    >
                      {notificationPermission === 'granted'
                        ? 'Test Push Alert'
                        : 'Enable Push Alerts'}
                    </button>
                  </div>

                  {/* Custom Break Interval Sliders */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <label className="block text-xs text-slate-500">
                        Focus Sprint (Minutes)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="180"
                        value={focusDurationMins}
                        onChange={(e) => {
                          const v = clampInt(Number(e.target.value), 15, 180);
                          setFocusDurationMins(v);
                          if (timerMode === 'focus' && !timerRunning) {
                            setTimerSecondsLeft(v * 60);
                          }
                        }}
                        className="mt-1 w-full px-2.5 py-1 text-sm font-mono tabular-nums font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <label className="block text-xs text-slate-500">
                        Break Interval (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={breakDurationMins}
                        onChange={(e) => {
                          const v = clampInt(Number(e.target.value), 5, 60);
                          setBreakDurationMins(v);
                          if (timerMode === 'break' && !timerRunning) {
                            setTimerSecondsLeft(v * 60);
                          }
                        }}
                        className="mt-1 w-full px-2.5 py-1 text-sm font-mono tabular-nums font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Scheduled Habit Reminders List */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            {rem.title}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                            {rem.time} · {rem.subject} · {rem.days.join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setReminders((prev) =>
                              prev.map((r) =>
                                r.id === rem.id ? { ...r, enabled: !r.enabled } : r
                              )
                            )
                          }
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            rem.enabled
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {rem.enabled ? 'Active' : 'Muted'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Reminder Form */}
                  <form
                    onSubmit={handleAddReminder}
                    className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3"
                  >
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Add Custom Study or Break Reminder
                    </div>
                    <input
                      type="text"
                      required
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      placeholder="e.g., Inorganic P-Block NCERT Table Revision"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                      <select
                        value={newReminderSubject}
                        onChange={(e) =>
                          setNewReminderSubject(
                            e.target.value as NeetSubject | 'Break' | 'Revision'
                          )
                        }
                        className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="Revision">Revision</option>
                        <option value="Break">Break Interval</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Botany">Botany</option>
                        <option value="Zoology">Zoology</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Save Custom Reminder
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 5: PEER DOUBT FORUM, STUDY GROUPS & OFFLINE RESOURCE VAULT
           ========================================================= */}
        {activeTab === 'community' && (
          <div className="space-y-10">
            {/* Section A: Curated Resource Library with Offline Vault */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Curated NCERT Resource Library & Offline Study Vault
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Download high-yield NCERT revision notes, formula sheets, and video lecture transcripts for zero-internet study sessions
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(['All', 'Physics', 'Chemistry', 'Botany', 'Zoology'] as const).map(
                    (subj) => (
                      <button
                        key={subj}
                        onClick={() => setResourceFilter(subj)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          resourceFilter === subj
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {subj}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setOfflineOnlyFilter((v) => !v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      offlineOnlyFilter
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 border-transparent'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Offline Vault ({offlineResourceIds.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredResources.map((resItem) => {
                  const isSavedOffline = offlineResourceIds.includes(resItem.id);
                  return (
                    <div
                      key={resItem.id}
                      className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        {/* Unboxed Metadata with · separators */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {resItem.subject}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{resItem.type}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{resItem.durationOrPages}</span>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                          {resItem.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {resItem.summary}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedResource(resItem)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Read Study Notes
                        </button>

                        <button
                          onClick={() => toggleOfflineResource(resItem)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                            isSavedOffline
                              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          {isSavedOffline ? 'Saved Offline' : 'Save Offline'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Offline Note Reader Modal */}
            {selectedResource && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        {selectedResource.subject} · {selectedResource.type} ·{' '}
                        {selectedResource.instructorOrSource}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {selectedResource.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedResource(null)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200">
                    {selectedResource.offlineContent}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Available in Offline Vault without internet connection
                    </span>
                    <button
                      onClick={() => setSelectedResource(null)}
                      className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium"
                    >
                      Done Reading
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Section B: Peer Doubt Resolution Forum & Social Study Groups */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Peer Support & Doubt Resolution Forum (7 Columns) */}
              <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Peer Support & Doubt Resolution Forum
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Post conceptual NEET doubts and collaborate with fellow aspirants
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['All', 'Physics', 'Chemistry', 'Botany', 'Zoology'] as const).map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => setForumSubjectFilter(s)}
                          className={`px-2.5 py-1 text-xs rounded-md ${
                            forumSubjectFilter === s
                              ? 'bg-slate-900 text-white dark:bg-emerald-600'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* New Doubt Form */}
                <form
                  onSubmit={handleCreateForumPost}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Post a New NEET Doubt (+30 XP)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newDoubtSubject}
                      onChange={(e) =>
                        setNewDoubtSubject(e.target.value as NeetSubject | 'Strategy')
                      }
                      className="px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Botany">Botany</option>
                      <option value="Zoology">Zoology</option>
                      <option value="Strategy">Strategy</option>
                    </select>
                    <input
                      type="text"
                      value={newDoubtChapter}
                      onChange={(e) => setNewDoubtChapter(e.target.value)}
                      placeholder="Chapter name..."
                      className="px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={newDoubtTitle}
                    onChange={(e) => setNewDoubtTitle(e.target.value)}
                    placeholder="Doubt question title..."
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <textarea
                    required
                    rows={2}
                    value={newDoubtBody}
                    onChange={(e) => setNewDoubtBody(e.target.value)}
                    placeholder="Describe the NCERT line, PYQ question number, or step where you are stuck..."
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Publish Doubt to Peer Forum
                  </button>
                </form>

                {/* Forum Posts List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {forumPosts
                    .filter(
                      (p) =>
                        forumSubjectFilter === 'All' || p.subject === forumSubjectFilter
                    )
                    .map((post) => (
                      <div key={post.id} className="py-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {post.subject}
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span>{post.chapter}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{post.authorName}</span>
                          </div>
                          <span className="font-mono">
                            {post.resolved ? 'Resolved' : 'Open Doubt'}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {post.body}
                        </p>
                        <div className="pt-1 flex items-center gap-4 text-xs">
                          <button
                            onClick={() => handleUpvotePost(post)}
                            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono tabular-nums"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{post.upvotes} Upvotes</span>
                          </button>
                          <span className="text-slate-400 font-mono tabular-nums">
                            {post.replyCount} Peer Answers
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Social Study Groups & Peer Progress Comparison (5 Columns) */}
              <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Study Groups & Peer Comparison
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Compare mock test averages and weekly targets with study squads
                    </p>
                  </div>
                  <button
                    onClick={handleShareProgress}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Copy Share Card
                  </button>
                </div>

                {/* Your Standing vs Study Groups */}
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Your Benchmark vs Active Study Squads
                  </div>
                  <div className="flex items-center justify-between font-mono tabular-nums">
                    <span className="text-slate-500">Your Latest Mock / Avg:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {latestMock?.totalScore ?? 0} / {averageMockScore} (720)
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono tabular-nums">
                    <span className="text-slate-500">Top Squad Benchmark:</span>
                    <span className="text-slate-800 dark:text-slate-200">648 / 720</span>
                  </div>
                </div>

                {/* Study Groups List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {studyGroups.map((grp) => {
                    const joined = joinedGroupIds.includes(grp.id);
                    return (
                      <div key={grp.id} className="py-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                              {grp.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Focus: {grp.focusTopic}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setJoinedGroupIds((prev) =>
                                joined
                                  ? prev.filter((id) => id !== grp.id)
                                  : [...prev, grp.id]
                              )
                            }
                            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 ${
                              joined
                                ? 'bg-emerald-600 text-white'
                                : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {joined ? 'Joined Squad' : 'Join Group'}
                          </button>
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500">
                          {grp.memberCount + (joined ? 1 : 0)} Members · Avg Mock:{' '}
                          {grp.avgMockScore}/720 · Goal: {grp.weeklyGoalHours}h/wk
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Create New Study Group Form */}
                <form
                  onSubmit={handleCreateStudyGroup}
                  className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Create a New Peer Study Group
                  </div>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Study group name (e.g., NEET 2027 Top 500 Rankers)..."
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    required
                    value={newGroupTopic}
                    onChange={(e) => setNewGroupTopic(e.target.value)}
                    placeholder="Weekly focus topic..."
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Launch Study Group
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
