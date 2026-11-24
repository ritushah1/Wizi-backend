const punchoutQueue = require('../queues/punchoutQueue');

async function addPunchoutQueue(data, delayTime) {
  try {
    await punchoutQueue.add('auto-punchout-job', data, {
      delay: delayTime,
      jobId: `punchout-${data.AttendanceTransID}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: {
        age: 1 * 24 * 3600, // 1 day, in seconds
        count: 1000,
      },
      removeOnFail: {
        age: 3 * 24 * 3600, // 3 days, in seconds
        count: 5000,
      },
    });
  } catch (error) {
    console.error(
      `Error adding punchout queue for AttendanceTransID ${data?.AttendanceTransID}:`,
      error,
    );

    return null;
  }
}

async function removePunchoutQueue(AttendanceTransID) {
  try {
    // Cancel the scheduled auto-punchout job
    const job = await punchoutQueue.getJob(`punchout-${AttendanceTransID}`);

    if (job) {
      await job.remove();
    }
  } catch (error) {
    console.error(
      `Error removing punchout queue for AttendanceTransID ${AttendanceTransID}:`,
      error,
    );

    return null;
  }
}

async function checkJobById(attendanceId) {
  try {
    const job = await punchoutQueue.getJob(`punchout-${attendanceId}`);

    if (!job) {
      return 'No job found — either never scheduled or already processed/removed';
    }

    const state = await job.getState(); // 'delayed', 'waiting', 'active', 'completed', 'failed'

    console.log('Job state:', state);
    console.log('Job data:', job.data);
    console.log(
      'Scheduled to run at:',
      new Date(job.timestamp + job.opts.delay),
    );

    return job;
  } catch (error) {
    console.error(
      `Error checking punchout queue for AttendanceTransID ${attendanceId}:`,
      error,
    );

    return null;
  }
}

async function listJobs(type) {
  try {
    const Jobs = await punchoutQueue.getJobs([type]);

    return Jobs;
  } catch (error) {
    console.error(`Error listing punchout queue jobs for type ${type}:`, error);

    return null;
  }
}

module.exports = {
  addPunchoutQueue,
  removePunchoutQueue,
  checkJobById,
  listJobs,
};
