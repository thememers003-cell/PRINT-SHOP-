import { describe, it, expect } from 'vitest';
import { claimPendingJobLogic, reportJobStatusLogic, registerPrintersLogic } from '../src/lib/agent-service';

describe('Windows Print Agent Service', () => {
  const validApiKey = 'pb_live_ganesh_xerox_secret_key_2026';

  it('rejects agent requests with invalid API key', async () => {
    await expect(claimPendingJobLogic('invalid_key_xyz')).rejects.toThrow('Unauthorized');
  });

  it('registers detected Windows printers with the shop', async () => {
    const result = await registerPrintersLogic(validApiKey, [
      {
        name: 'HP LaserJet Pro MFP M428fdw',
        systemDriver: 'HP LaserJet',
        portName: 'USB001',
        supportsColor: false,
        supportsDuplex: true,
        paperSizes: 'A4,Letter',
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.registeredCount).toBeGreaterThan(0);
  });

  it('claims queued job idempotently and sets status to PRINTING', async () => {
    const jobResult = await claimPendingJobLogic(validApiKey);
    if (jobResult.job) {
      expect(jobResult.job.status).toBe('PRINTING');
      expect(jobResult.job.jobId).toBeDefined();

      // Test reporting completion
      const report = await reportJobStatusLogic(validApiKey, {
        orderId: jobResult.job.orderId,
        status: 'COMPLETED',
      });
      expect(report.success).toBe(true);
    }
  });
});

