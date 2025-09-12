    import express from 'express';
    import { registerSuperUser, loginSuperUser, changeSuperUserPassword, forgotPassword, resetPassword } from '../../controllers/Admin/admin.js';

    const router = express.Router();

    router.post('/registersuperuser', registerSuperUser);
    router.post('/loginSuperUser', loginSuperUser);

    // Route for changing Super User password
    router.post('/changeSuperUserPassword', changeSuperUserPassword);
    router.post('/forgotPassword', forgotPassword);

    // Reset password route
    router.post('/resetPassword', resetPassword); // Use the imported resetPassword function

    export const superUserRouter = router;
