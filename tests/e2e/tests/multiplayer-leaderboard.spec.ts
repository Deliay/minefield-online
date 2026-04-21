import { test, expect } from '@playwright/test';

test.describe('multiplayer leaderboard', () => {
  test('two players can connect and see correct session IDs and scores', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    const getCookie = (p: typeof page1, name: string) => {
      return p.evaluate((cookieName) => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [k, v] = cookie.trim().split('=');
          if (k === cookieName) return v;
        }
        return null;
      }, name);
    };

    const getYouScore = async (p: typeof page1) => {
      return p.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        for (const span of spans) {
          if (span.textContent?.trim() === 'You:') {
            const nextSpan = span.nextElementSibling as HTMLElement | null;
            if (nextSpan) {
              const text = nextSpan.textContent || '';
              const match = text.match(/([a-f0-9]{6}) - (-?\d+)/);
              if (match) {
                return { sessionId: match[1], score: parseInt(match[2], 10) };
              }
            }
          }
        }
        return null;
      });
    };

    const sessionId1 = await getCookie(page1, 'minefield_session_id');
    const sessionId2 = await getCookie(page2, 'minefield_session_id');
    console.log('Session IDs:', sessionId1?.slice(0, 6), sessionId2?.slice(0, 6));

    expect(sessionId1).not.toBeNull();
    expect(sessionId2).not.toBeNull();
    expect(sessionId1).not.toBe(sessionId2);

    const p1Data = await getYouScore(page1);
    const p2Data = await getYouScore(page2);
    console.log('P1:', p1Data, 'P2:', p2Data);

    expect(p1Data).not.toBeNull();
    expect(p2Data).not.toBeNull();
    expect(p1Data!.sessionId).toBe(sessionId1?.slice(0, 6));
    expect(p2Data!.sessionId).toBe(sessionId2?.slice(0, 6));
    expect(p1Data!.score).toBe(0);
    expect(p2Data!.score).toBe(0);

    await context1.close();
    await context2.close();
  });

  test('leaderboard shows both players', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    const p1SessionId = await page1.evaluate(() => {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [k, v] = cookie.trim().split('=');
        if (k === 'minefield_session_id') return v?.slice(0, 6);
      }
      return null;
    });

    const leaderboardData = await page2.evaluate((expectedSessionId) => {
      const spans = Array.from(document.querySelectorAll('span'));
      const scores: { sessionId: string; score: number }[] = [];
      for (const span of spans) {
        if (span.textContent?.match(/^#[0-9]+$/)) {
          const parent = span.parentElement;
          if (parent) {
            const siblingSpans = parent.querySelectorAll('span');
            if (siblingSpans.length === 3) {
              const sessionId = siblingSpans[1].textContent || '';
              const scoreText = siblingSpans[2].textContent || '';
              const score = parseInt(scoreText, 10);
              if (!isNaN(score)) {
                scores.push({ sessionId, score });
              }
            }
          }
        }
      }
      return scores;
    }, p1SessionId);

    console.log('Leaderboard on page 2:', leaderboardData);
    expect(leaderboardData.length).toBeGreaterThanOrEqual(2);

    await context1.close();
    await context2.close();
  });
});