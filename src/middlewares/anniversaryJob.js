import cron from 'node-cron';
import { getTodayAnniversaries } from '../controllers/Msfs/anniversarynotification.js';
import { sendAnniversaryEmails } from '../controllers/Msfs/anniversarynotification.js';

// Schedule the cron job to run daily at 10:30 AM
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('Running anniversary email job at 12:00 AM...');

        // Mock request, response, and next objects for getTodayAnniversaries
        const req = { query: {} }; // No input data required
        const res = {
            status: (statusCode) => ({
                json: async (data) => {
                    if (statusCode === 200) {
                        console.log('Anniversaries found:', data);
                        await sendAnniversaryEmails(data); // Send emails
                    } else {
                        console.log('No anniversaries found for today.');
                    }
                },
            }),
        };
        const next = (err) => console.error('Error in scheduled job:', err);

        await getTodayAnniversaries(req, res, next);
    } catch (error) {
        console.error('Error executing anniversary email job:', error);
    }
});
