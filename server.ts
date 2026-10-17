import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// POST /api/mentor/analyze - Analyze NEET student's weak chapters & mock test trends
app.post('/api/mentor/analyze', async (req, res) => {
  try {
    const {
      weakChapters = [],
      completedCount = 0,
      totalChapters = 38,
      mockTests = [],
      targetScore = 680,
      daysRemaining = 198,
      customQuestion = '',
    } = req.body || {};

    const ai = getGenAIClient();

    const latestMocksSummary = Array.isArray(mockTests)
      ? mockTests
          .slice(0, 5)
          .map(
            (m: Record<string, unknown>) =>
              `${m.title} (${m.testDate}): Total ${m.totalScore}/720 [Physics: ${m.physicsScore}/180, Chemistry: ${m.chemistryScore}/180, Biology: ${m.biologyScore}/360, Accuracy: ${m.accuracyPct}%]`
          )
          .join('\n')
      : 'No mock tests recorded yet.';

    const weakList = Array.isArray(weakChapters) && weakChapters.length > 0
      ? weakChapters.join(', ')
      : 'Rotational Motion, Equilibrium, Thermodynamics, Principles of Inheritance, Chemical Coordination';

    const prompt = `You are a Senior NEET UG Academic Mentor (720/720 NCERT & PYQ specialist).
Analyze the following NEET student's real-time performance telemetry and produce a structured diagnostic & 7-day high-yield revision plan:
- Days until NEET UG Exam: ${daysRemaining} days
- Target Score: ${targetScore} / 720
- NCERT Syllabus Completed: ${completedCount} / ${totalChapters} chapters
- Flagged Weak / Pending High-Weightage Chapters: ${weakList}
- Recent Mock Test Performance:
${latestMocksSummary}
${customQuestion ? `\nStudent's Specific Question / Focus Area: "${customQuestion}"` : ''}

Provide actionable, NCERT-grounded advice with specific chapter sub-topics, negative-marking elimination tactics (+4/-1 strategy), and a concrete 7-day micro-schedule.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallDiagnosis: {
              type: Type.STRING,
              description: 'Concise 2-3 sentence clinical diagnosis of current score trajectory vs target.',
            },
            predictedScoreBand: {
              type: Type.STRING,
              description: 'Projected NEET score band based on current trajectory (e.g., "635 - 655 / 720").',
            },
            negativeMarkingPrescription: {
              type: Type.STRING,
              description: 'Specific tactic to reduce -1 negative marking in Physics/Chemistry numericals and Biology assertion-reason questions.',
            },
            priorityWeakTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  chapter: { type: Type.STRING },
                  ncertFocus: { type: Type.STRING, description: 'Exact NCERT pages, diagrams, or formula cluster to master.' },
                  expectedQuestions: { type: Type.INTEGER, description: 'Typical number of NEET questions from this topic.' },
                },
                required: ['subject', 'chapter', 'ncertFocus', 'expectedQuestions'],
              },
            },
            sevenDayPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  focusBlock: { type: Type.STRING },
                  pyqTarget: { type: Type.STRING },
                },
                required: ['day', 'focusBlock', 'pyqTarget'],
              },
            },
            directAnswer: {
              type: Type.STRING,
              description: 'Direct response to the student custom question if provided, or high-yield NCERT pearl.',
            },
          },
          required: [
            'overallDiagnosis',
            'predictedScoreBand',
            'negativeMarkingPrescription',
            'priorityWeakTopics',
            'sevenDayPlan',
            'directAnswer',
          ],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text.trim());
    res.json(parsed);
  } catch (error) {
    console.error('AI Mentor Analysis Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate AI Mentor analysis.',
    });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AetherNEET server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
